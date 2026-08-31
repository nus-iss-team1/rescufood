// Schema for this service's own notifications database.

import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const notificationChannel = pgEnum('notification_channel', [
  'email',
  'in_app',
]);

export const notificationType = pgEnum('notification_type', [
  'org_approved',
  'user_welcome',
  'claim_created',
  'claim_cancelled',
  'listing_material_change',
  'pickup_reminder',
  'pickup_completed',
  'listing_expired',
]);

// Outcome of one delivery attempt.
export const notificationStatus = pgEnum('notification_status', [
  'sent',
  'failed',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Required; the recipient's user account may not exist yet.
    recipientEmail: text('recipient_email').notNull(),
    // Cognito sub of the recipient; set for in-app notifications so the read
    // API can scope a listing to the caller.
    recipientUserId: text('recipient_user_id'),
    type: notificationType('type').notNull(),
    channel: notificationChannel('channel').notNull(),
    payload: jsonb('payload').notNull().default({}),
    status: notificationStatus('status').notNull(),
    failureReason: text('failure_reason'),
    // Stable per-recipient identifier for the domain event, from the producer.
    // Drives duplicate-processing protection; null on legacy messages.
    eventId: text('event_id'),
    // Rendered in-app message body; null for email rows.
    body: text('body'),
    // In-app read state; null while unread.
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('notifications_recipient_email_idx').on(table.recipientEmail),
    index('notifications_recipient_user_id_idx').on(table.recipientUserId),
    // One successful email per event per recipient.
    uniqueIndex('notifications_email_dedupe_uq')
      .on(table.eventId, table.recipientEmail)
      .where(
        sql`${table.channel} = 'email' and ${table.status} = 'sent' and ${table.eventId} is not null`,
      ),
    // One in-app notification per event per recipient.
    uniqueIndex('notifications_inapp_dedupe_uq')
      .on(table.eventId, table.recipientUserId)
      .where(sql`${table.channel} = 'in_app' and ${table.eventId} is not null`),
  ],
);
