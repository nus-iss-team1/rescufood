import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

// Project-local file global-setup writes the container's connection string to.
export const DATABASE_URL_FILE = join(
  __dirname,
  '..',
  '..',
  '..',
  'node_modules',
  '.cache',
  'notifications-integration-db-url',
);

// globalThis key holding the container handle for teardown.
export const CONTAINER_GLOBAL = '__notificationsIntegrationPg__';

let pool: Pool | undefined;

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? readFileSync(DATABASE_URL_FILE, 'utf8');
}

// Shared pool for test setup and assertions.
export function testPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl() });
    // Swallow the 'error' event pg emits when the container stops.
    pool.on('error', () => {});
  }
  return pool;
}

export async function closeTestPool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

export async function resetDb(): Promise<void> {
  await testPool().query('TRUNCATE notifications RESTART IDENTITY');
}

type NotificationType =
  | 'org_approved'
  | 'user_welcome'
  | 'claim_created'
  | 'claim_cancelled'
  | 'listing_material_change'
  | 'pickup_reminder'
  | 'pickup_completed'
  | 'listing_expired';

export interface SeededNotification {
  id: string;
  recipientUserId: string;
  recipientEmail: string;
  type: NotificationType;
  channel: 'email' | 'in_app';
  status: 'sent' | 'failed';
  body: string | null;
  eventId: string | null;
  readAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

// Inserts one notification row. Defaults to a live, unread in-app one.
export async function seedNotification(
  overrides: Partial<SeededNotification> = {},
): Promise<SeededNotification> {
  const slug = randomUUID().slice(0, 8);
  const row: SeededNotification = {
    id: randomUUID(),
    recipientUserId: `sub-${slug}`,
    recipientEmail: `user-${slug}@example.org`,
    type: 'claim_created',
    channel: 'in_app',
    status: 'sent',
    body: 'A partner reserved your listing.',
    eventId: `event-${slug}`,
    readAt: null,
    deletedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
  await testPool().query(
    `INSERT INTO notifications
       (id, recipient_user_id, recipient_email, type, channel, status, body, event_id, read_at, deleted_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      row.id,
      row.recipientUserId,
      row.recipientEmail,
      row.type,
      row.channel,
      row.status,
      row.body,
      row.eventId,
      row.readAt,
      row.deletedAt,
      row.createdAt,
    ],
  );
  return row;
}

export interface NotificationRow {
  id: string;
  channel: string;
  status: string;
  read_at: Date | null;
  deleted_at: Date | null;
  event_id: string | null;
}

export async function getNotificationRow(
  id: string,
): Promise<NotificationRow | undefined> {
  const { rows } = await testPool().query<NotificationRow>(
    `SELECT id, channel, status, read_at, deleted_at, event_id
     FROM notifications WHERE id = $1`,
    [id],
  );
  return rows[0];
}

export async function countRows(where = 'true'): Promise<number> {
  const { rows } = await testPool().query<{ count: string }>(
    `SELECT count(*)::text AS count FROM notifications WHERE ${where}`,
  );
  return Number(rows[0].count);
}
