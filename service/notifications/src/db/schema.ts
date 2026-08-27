// Schema for this service's own notifications database.

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const notificationChannel = pgEnum('notification_channel', [
  'email',
  'in_app',
]);

export const notificationType = pgEnum('notification_type', [
  'org_approved',
  'user_welcome',
  'claim_requested',
  'claim_accepted',
  'claim_declined',
  'claim_superseded',
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
    // Unused until in-app notifications need per-user lookup.
    recipientUserId: uuid('recipient_user_id'),
    type: notificationType('type').notNull(),
    channel: notificationChannel('channel').notNull(),
    payload: jsonb('payload').notNull().default({}),
    status: notificationStatus('status').notNull(),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('notifications_recipient_email_idx').on(table.recipientEmail),
    index('notifications_recipient_user_id_idx').on(table.recipientUserId),
  ],
);
