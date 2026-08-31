// Tables owned by service/listings (FR2-FR6). Managed by drizzle-kit -
// this file is the `schema` entry in drizzle.config.ts.
//
// Columns that reference organisations/users (owned by service/profile) are
// plain `uuid` columns, not `.references()` - both services share one
// physical Postgres database, so the actual FK constraints are added via a
// hand-written migration (see db/migrations/0002_cross_service_fks.sql)
// instead of letting drizzle-kit try to manage tables it doesn't own.

import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
  check,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const listingCategory = pgEnum('listing_category', [
  'produce',
  'bakery',
  'dairy',
  'meat_seafood',
  'prepared_food',
  'packaged_dry_goods',
  'beverages',
  'other',
]);

export const listingStatus = pgEnum('listing_status', [
  'draft',
  'available',
  'reserved',
  'collected',
  'expired',
  'cancelled',
]);

export const requestStatus = pgEnum('request_status', [
  'active',
  'cancelled',
  'completed',
  'no_show',
  'expired',
]);

export const idempotencyStatus = pgEnum('idempotency_status', [
  'pending',
  'completed',
]);

// ---------------------------------------------------------------------------
// listings (FR2)
// ---------------------------------------------------------------------------

export const listings = pgTable(
  'listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    donorOrgId: uuid('donor_org_id').notNull(), // FK -> organisations.id (service/profile)
    createdBy: uuid('created_by').notNull(), // FK -> users.id (service/profile)
    // Nullable: a Draft can be saved with only some fields filled in -
    // validateForPublication is what requires these before status can
    // become 'available' (see the CHECK below, and publication-validation
    // util.ts).
    category: listingCategory('category'),
    description: text('description'),
    // The size of the whole lot. A claim never changes it - the whole
    // listing is claimed at once.
    quantity: numeric('quantity', {
      precision: 10,
      scale: 2,
    }),
    unit: text('unit'),
    // NOT NULL, unlike the rest above - '{}' is itself the "not yet
    // declared" sentinel that validateForPublication checks for, so there's
    // no separate null state to represent.
    allergens: text('allergens')
      .array()
      .notNull()
      .default(sql`'{}'`),
    handlingInstructions: text('handling_instructions').notNull().default(''),
    useBy: timestamp('use_by', { withTimezone: true }),
    pickupLocation: text('pickup_location'),
    pickupWindowStart: timestamp('pickup_window_start', {
      withTimezone: true,
    }),
    pickupWindowEnd: timestamp('pickup_window_end', {
      withTimezone: true,
    }),
    status: listingStatus('status').notNull().default('draft'),
    version: integer('version').notNull().default(1),
    cancelledReason: text('cancelled_reason').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Soft delete: null means active. Every read path (findById, findMany,
    // updateWithVersion) filters this out, so a deleted listing behaves as
    // gone to callers while the row - and its history - is retained.
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    check(
      'pickup_window_valid',
      sql`${table.pickupWindowEnd} > ${table.pickupWindowStart}`,
    ),
    check('quantity_non_negative', sql`${table.quantity} >= 0`),
    // Backstop for the publish gate in ListingsService.update() - status
    // can't become 'available' with an incomplete Draft, even via raw SQL.
    check(
      'available_listing_is_complete',
      sql`${table.status} <> 'available' or (
        ${table.category} is not null and
        ${table.description} is not null and
        ${table.quantity} is not null and
        ${table.unit} is not null and
        ${table.useBy} is not null and
        ${table.pickupLocation} is not null and
        ${table.pickupWindowStart} is not null and
        ${table.pickupWindowEnd} is not null and
        coalesce(array_length(${table.allergens}, 1), 0) > 0
      )`,
    ),
    index('listings_discovery_idx').on(
      table.status,
      table.pickupLocation,
      table.category,
    ),
    index('listings_expiry_scan_idx')
      .on(table.pickupWindowEnd)
      .where(sql`status in ('available', 'reserved')`),
    index('listings_donor_org_id_idx').on(table.donorOrgId),
  ],
);

// ---------------------------------------------------------------------------
// listing_images
// ---------------------------------------------------------------------------

export const listingImages = pgTable(
  'listing_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id),
    // S3 object key only, not a full URL - keeps bucket/region/CDN-domain
    // changes from requiring a data migration.
    s3Key: text('s3_key').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('listing_images_listing_position_uq').on(
      table.listingId,
      table.position,
    ),
    index('listing_images_listing_id_idx').on(table.listingId),
  ],
);

// ---------------------------------------------------------------------------
// requests (FR3, FR4) - a rescue org's "claim" on a listing. First-come-
// first-served: creating a claim reserves the whole listing in one
// transaction (listing available -> reserved), then it runs to pickup.
// Born 'active', ends completed/cancelled/no_show/expired. At most one
// 'active' claim per listing (see requests_active_claim_per_listing_uq).
// ---------------------------------------------------------------------------

export const requests = pgTable(
  'requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id),
    rescueOrgId: uuid('rescue_org_id').notNull(), // FK -> organisations.id (service/profile)
    claimedBy: uuid('claimed_by').notNull(), // FK -> users.id (service/profile) - the rescue-partner user
    status: requestStatus('status').notNull().default('active'),
    requestedQuantity: numeric('requested_quantity', {
      precision: 10,
      scale: 2,
    }).notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason').notNull().default(''),

    // Pickup verification - one shared code, shown as QR or typed as OTP.
    pickupCodeHash: text('pickup_code_hash'),
    codeExpiresAt: timestamp('code_expires_at', { withTimezone: true }),
    codeGeneratedBy: uuid('code_generated_by'), // FK -> users.id
    // Failed verify attempts against the current code; reset to 0 on each
    // new code.
    pickupCodeAttempts: integer('pickup_code_attempts').notNull().default(0),
    verifiedBy: uuid('verified_by'), // FK -> users.id
    collectedQuantity: numeric('collected_quantity', {
      precision: 10,
      scale: 2,
    }),
    collectedAt: timestamp('collected_at', { withTimezone: true }),
    noShowReason: text('no_show_reason').notNull().default(''),

    // Set when each one-shot pickup reminder has been queued.
    pickupOpenReminderSentAt: timestamp('pickup_open_reminder_sent_at', {
      withTimezone: true,
    }),
    pickupCloseReminderSentAt: timestamp('pickup_close_reminder_sent_at', {
      withTimezone: true,
    }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('requested_quantity_positive', sql`${table.requestedQuantity} > 0`),
    index('requests_listing_id_idx').on(table.listingId),
    index('requests_rescue_org_id_idx').on(table.rescueOrgId),
    index('requests_status_idx').on(table.status),
    // At most one 'active' claim per listing; ending a claim frees the listing.
    uniqueIndex('requests_active_claim_per_listing_uq')
      .on(table.listingId)
      .where(sql`status = 'active'`),
  ],
);

// ---------------------------------------------------------------------------
// request_idempotency_keys - makes claim creation idempotent per rescue org.
// A row is a claimed (org, key) slot: born 'pending', flipped to 'completed'
// in the claim's own transaction. An identical retry replays claimId; a key
// reused with a different fingerprint is a conflict. The retention sweep
// deletes rows past expiresAt (short-lived while 'pending' so an abandoned
// attempt is reclaimed; extended to the configured window on completion).
// ---------------------------------------------------------------------------

export const requestIdempotencyKeys = pgTable(
  'request_idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rescueOrgId: uuid('rescue_org_id').notNull(), // FK -> organisations.id (service/profile)
    idempotencyKey: text('idempotency_key').notNull(),
    // sha256 of the claim-defining request fields - see request-fingerprint.util.ts.
    requestFingerprint: text('request_fingerprint').notNull(),
    status: idempotencyStatus('status').notNull().default('pending'),
    claimId: uuid('claim_id').references(() => requests.id),
    // Serialised public claim as returned originally - kept for audit/debugging
    // (replay re-reads the claim by claimId).
    responseSnapshot: jsonb('response_snapshot'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('request_idempotency_keys_org_key_uq').on(
      table.rescueOrgId,
      table.idempotencyKey,
    ),
    index('request_idempotency_keys_expires_at_idx').on(table.expiresAt),
  ],
);

// ---------------------------------------------------------------------------
// audit_log (FR6) - append-only. No update/delete repository method should
// ever be written against this table; DB-role write restrictions are
// applied separately when the service's DB role is provisioned in infra.
// ---------------------------------------------------------------------------

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'), // FK -> users.id (service/profile), nullable for system actions
    orgId: uuid('org_id'), // FK -> organisations.id (service/profile)
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    reason: text('reason').notNull().default(''),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_log_entity_idx').on(table.entityType, table.entityId),
    index('audit_log_user_idx').on(table.userId),
  ],
);
