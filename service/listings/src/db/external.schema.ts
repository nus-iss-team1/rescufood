// Read-only typing stubs for tables owned and migrated by service/profile
// (Go / golang-migrate), which lives in the same physical Postgres database.
//
// These are intentionally NOT included in drizzle.config.ts's `schema` glob,
// so `drizzle-kit generate`/`push` never tries to create, alter, or drop
// them - service/profile remains the sole owner of their DDL. They exist
// here purely so this service's queries and FK references get type safety.
//
// Keep these column definitions in sync with:
//   service/profile/db/migrations/0001_init.up.sql
//   service/profile/db/migrations/0002_org_domain.up.sql

import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const organisations = pgTable('organisations', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  domain: text('domain').notNull(),
  description: text('description').notNull(),
  contactEmail: text('contact_email').notNull(),
  contactPhone: text('contact_phone').notNull(),
  address: text('address').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  cognitoSub: text('cognito_sub').notNull(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  orgId: uuid('org_id'),
  isAdmin: boolean('is_admin').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});
