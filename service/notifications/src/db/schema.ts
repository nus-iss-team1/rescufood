// Own database (unlike listings, which shares profile's) - a delivery record never needs to join listings/profile tables.

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

// org_approved plus listings' original (unused) draft types, reserved for later.
export const notificationType = pgEnum('notification_type', [
  'org_approved',
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

// Outcome of one attempt - SQS owns retries, not this table.
export const notificationStatus = pgEnum('notification_status', [
  'sent',
  'failed',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Always required - a user account may not exist yet (org registration precedes user signup).
    recipientEmail: text('recipient_email').notNull(),
    // Nullable until in-app notifications need to query by user.
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
