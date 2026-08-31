import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, lt, notInArray, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { notifications } from '../db/schema';
import type {
  NotificationChannel,
  NotificationType,
} from './notification-message.dto';

const PG_UNIQUE_VIOLATION = '23505';

// A recipient's in-app feed is capped at this many notifications. When a
// newer one arrives, older ones past the cap are soft-deleted.
export const IN_APP_FEED_LIMIT = 10;

export interface NotificationRecord {
  recipientEmail: string;
  type: NotificationType;
  channel: NotificationChannel;
  payload: Record<string, unknown>;
  status: 'sent' | 'failed';
  failureReason?: string;
  eventId?: string;
}

export interface InAppNotificationInput {
  recipientUserId: string;
  recipientEmail: string;
  type: NotificationType;
  eventId?: string;
  body: string;
  payload: Record<string, unknown>;
}

export interface InAppNotification {
  id: string;
  type: NotificationType;
  body: string | null;
  payload: unknown;
  readAt: Date | null;
  createdAt: Date;
}

export interface ListInAppOptions {
  unreadOnly?: boolean;
  limit?: number;
  before?: Date;
}

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // Appends one delivery-attempt row to the audit log.
  async record(entry: NotificationRecord): Promise<void> {
    await this.db.insert(notifications).values(entry);
  }

  // True when this event was already delivered on this channel to this recipient.
  async alreadyDelivered(
    eventId: string,
    channel: NotificationChannel,
    recipientEmail: string,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.eventId, eventId),
          eq(notifications.channel, channel),
          eq(notifications.recipientEmail, recipientEmail),
          eq(notifications.status, 'sent'),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  // Inserts one in-app notification; returns 'duplicate' when an identical
  // (eventId, recipient) row already exists.
  async createInApp(
    input: InAppNotificationInput,
  ): Promise<'created' | 'duplicate'> {
    try {
      await this.db.insert(notifications).values({
        recipientEmail: input.recipientEmail,
        recipientUserId: input.recipientUserId,
        type: input.type,
        channel: 'in_app',
        payload: input.payload,
        status: 'sent',
        eventId: input.eventId,
        body: input.body,
      });
      return 'created';
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: string }).code === PG_UNIQUE_VIOLATION
      ) {
        return 'duplicate';
      }
      throw error;
    }
  }

  async listInApp(
    recipientUserId: string,
    options: ListInAppOptions = {},
  ): Promise<InAppNotification[]> {
    const limit = Math.min(
      Math.max(options.limit ?? IN_APP_FEED_LIMIT, 1),
      100,
    );
    const conditions = [
      eq(notifications.channel, 'in_app'),
      eq(notifications.recipientUserId, recipientUserId),
      isNull(notifications.deletedAt),
    ];
    if (options.unreadOnly) conditions.push(isNull(notifications.readAt));
    if (options.before) {
      conditions.push(lt(notifications.createdAt, options.before));
    }
    return this.db
      .select({
        id: notifications.id,
        type: notifications.type,
        body: notifications.body,
        payload: notifications.payload,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async countUnread(recipientUserId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.channel, 'in_app'),
          eq(notifications.recipientUserId, recipientUserId),
          isNull(notifications.readAt),
          isNull(notifications.deletedAt),
        ),
      );
    return row?.count ?? 0;
  }

  // Marks one of the caller's own notifications read (idempotent); returns its
  // readAt, or null when no such in-app row belongs to the caller.
  async markRead(
    recipientUserId: string,
    id: string,
  ): Promise<{ readAt: Date } | null> {
    const [existing] = await this.db
      .select({ readAt: notifications.readAt })
      .from(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.channel, 'in_app'),
          eq(notifications.recipientUserId, recipientUserId),
        ),
      )
      .limit(1);
    if (!existing) return null;
    if (existing.readAt) return { readAt: existing.readAt };
    const [row] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientUserId, recipientUserId),
        ),
      )
      .returning({ readAt: notifications.readAt });
    return { readAt: row.readAt ?? new Date() };
  }

  async markAllRead(recipientUserId: string): Promise<number> {
    const rows = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.channel, 'in_app'),
          eq(notifications.recipientUserId, recipientUserId),
          isNull(notifications.readAt),
          isNull(notifications.deletedAt),
        ),
      )
      .returning({ id: notifications.id });
    return rows.length;
  }

  // Soft-deletes one of the caller's own in-app notifications (idempotent);
  // returns false when no such row belongs to the caller.
  async deleteForUser(recipientUserId: string, id: string): Promise<boolean> {
    const [existing] = await this.db
      .select({ deletedAt: notifications.deletedAt })
      .from(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.channel, 'in_app'),
          eq(notifications.recipientUserId, recipientUserId),
        ),
      )
      .limit(1);
    if (!existing) return false;
    if (!existing.deletedAt) {
      await this.db
        .update(notifications)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(notifications.id, id),
            eq(notifications.recipientUserId, recipientUserId),
          ),
        );
    }
    return true;
  }

  // Soft-deletes the caller's in-app notifications past the feed cap, keeping
  // the newest IN_APP_FEED_LIMIT. Called after a new one is created.
  async trimInAppFeed(recipientUserId: string): Promise<number> {
    const live = and(
      eq(notifications.channel, 'in_app'),
      eq(notifications.recipientUserId, recipientUserId),
      isNull(notifications.deletedAt),
    );

    const keep = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(live)
      .orderBy(desc(notifications.createdAt))
      .limit(IN_APP_FEED_LIMIT);
    if (keep.length < IN_APP_FEED_LIMIT) return 0;

    const rows = await this.db
      .update(notifications)
      .set({ deletedAt: new Date() })
      .where(
        and(
          live,
          notInArray(
            notifications.id,
            keep.map((r) => r.id),
          ),
        ),
      )
      .returning({ id: notifications.id });
    return rows.length;
  }
}
