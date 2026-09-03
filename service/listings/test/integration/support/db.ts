import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Pool } from 'pg';

// File global-setup writes the container's connection string to.
export const DATABASE_URL_FILE = join(tmpdir(), 'listings-itest-db-url');

// globalThis key holding the container handle for teardown.
export const CONTAINER_GLOBAL = '__listingsIntegrationPg__';

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

// Every table a test may write, truncated between tests.
const TABLES = [
  'audit_log',
  'request_idempotency_keys',
  'requests',
  'listing_images',
  'listings',
  'users',
  'organisations',
];

export async function resetDb(): Promise<void> {
  await testPool().query(
    `TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`,
  );
}

type OrgType = 'donor' | 'rescue_partner';
type OrgStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface SeededOrg {
  id: string;
  name: string;
  type: OrgType;
  status: OrgStatus;
  domain: string;
  contactEmail: string;
}

export async function seedOrg(
  overrides: Partial<SeededOrg> = {},
): Promise<SeededOrg> {
  const slug = randomUUID().slice(0, 8);
  const org: SeededOrg = {
    id: randomUUID(),
    name: `Org ${slug}`,
    type: 'donor',
    status: 'approved',
    domain: `${slug}.example.org`,
    contactEmail: `contact-${slug}@example.org`,
    ...overrides,
  };
  await testPool().query(
    `INSERT INTO organisations (id, name, type, status, domain, contact_email)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [org.id, org.name, org.type, org.status, org.domain, org.contactEmail],
  );
  return org;
}

export interface SeededUser {
  id: string;
  cognitoSub: string;
  email: string;
  name: string;
  orgId: string | null;
  isAdmin: boolean;
  status: string;
}

export async function seedUser(
  overrides: Partial<SeededUser> = {},
): Promise<SeededUser> {
  const slug = randomUUID().slice(0, 8);
  const user: SeededUser = {
    id: randomUUID(),
    cognitoSub: `sub-${slug}`,
    email: `user-${slug}@example.org`,
    name: `User ${slug}`,
    orgId: null,
    isAdmin: false,
    status: 'active',
    ...overrides,
  };
  await testPool().query(
    `INSERT INTO users (id, cognito_sub, email, name, org_id, is_admin, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      user.id,
      user.cognitoSub,
      user.email,
      user.name,
      user.orgId,
      user.isAdmin,
      user.status,
    ],
  );
  return user;
}

// An approved donor org with one member.
export async function seedDonor(): Promise<{
  org: SeededOrg;
  user: SeededUser;
}> {
  const org = await seedOrg({ type: 'donor', status: 'approved' });
  const user = await seedUser({ orgId: org.id });
  return { org, user };
}

// An approved rescue-partner org with one member.
export async function seedRescuePartner(): Promise<{
  org: SeededOrg;
  user: SeededUser;
}> {
  const org = await seedOrg({ type: 'rescue_partner', status: 'approved' });
  const user = await seedUser({ orgId: org.id });
  return { org, user };
}

type ListingStatus =
  'draft' | 'available' | 'reserved' | 'collected' | 'expired' | 'cancelled';

export interface SeededListing {
  id: string;
  donorOrgId: string;
  createdBy: string;
  status: ListingStatus;
  version: number;
  quantity: string;
  unit: string;
  pickupWindowEnd: Date;
}

// Inserts a listing: a complete 'available' one by default, a bare row for status 'draft'.
export async function seedListing(args: {
  donorOrgId: string;
  createdBy: string;
  status?: ListingStatus;
  pickupWindowStart?: Date;
  pickupWindowEnd?: Date;
  quantity?: string;
}): Promise<SeededListing> {
  const status = args.status ?? 'available';
  const start = args.pickupWindowStart ?? new Date(Date.now() + 60 * 60 * 1000);
  const end = args.pickupWindowEnd ?? new Date(Date.now() + 4 * 60 * 60 * 1000);
  const quantity = args.quantity ?? '10.00';
  const id = randomUUID();

  const complete = status !== 'draft';
  await testPool().query(
    `INSERT INTO listings (
       id, donor_org_id, created_by, status,
       category, description, quantity, unit, allergens,
       use_by, pickup_location, pickup_window_start, pickup_window_end
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      id,
      args.donorOrgId,
      args.createdBy,
      status,
      complete ? 'bakery' : null,
      complete ? 'A tray of day-old sourdough' : null,
      complete ? quantity : null,
      complete ? 'loaves' : null,
      complete ? ['gluten'] : [],
      complete ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
      complete ? 'Bakery back door, 12 Baker St' : null,
      complete ? start : null,
      complete ? end : null,
    ],
  );

  return {
    id,
    donorOrgId: args.donorOrgId,
    createdBy: args.createdBy,
    status,
    version: 1,
    quantity,
    unit: 'loaves',
    pickupWindowEnd: end,
  };
}

export interface ListingRow {
  status: string;
  version: number;
  deleted_at: Date | null;
}

export async function getListingRow(
  id: string,
): Promise<ListingRow | undefined> {
  const { rows } = await testPool().query<ListingRow>(
    `SELECT status, version, deleted_at FROM listings WHERE id = $1`,
    [id],
  );
  return rows[0];
}

export async function countRows(table: string): Promise<number> {
  const { rows } = await testPool().query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${table}`,
  );
  return Number(rows[0].count);
}
