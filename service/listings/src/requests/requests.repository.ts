import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  isNotNull,
  lte,
  notExists,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { AuthenticatedUser } from '../common/types/express';
import { DATABASE, type Database } from '../db/db.module';
import { organisations, users } from '../db/external.schema';
import { listings, requests } from '../db/schema';
import type { QueryRequestsDto } from './dto/query-requests.dto';

export type PickupReminderPhase = 'opening' | 'closing';

export type PickupReminderTarget = {
  listingDescription: string | null;
  pickupLocation: string | null;
  pickupWindowStart: Date | null;
  pickupWindowEnd: Date | null;
  rescueEmail: string;
  donorEmail: string;
};

export type ListingRequest = typeof requests.$inferSelect;
export type NewListingRequest = typeof requests.$inferInsert;
export type ListingRequestUpdate = Partial<NewListingRequest>;

// Just the listing columns RequestsService needs - not the full row.
// Nullable fields are guaranteed set once status is 'available' (see the
// available_listing_is_complete CHECK).
export type RequestedListing = {
  id: string;
  donorOrgId: string;
  status: (typeof listings.$inferSelect)['status'];
  description: string | null;
  quantity: string | null;
  unit: string | null;
  pickupLocation: string | null;
  pickupWindowStart: Date | null;
  pickupWindowEnd: Date | null;
};

// An org's contact details, for addressing notifications.
export type OrgContact = { id: string; name: string; contactEmail: string };

// The claimant's current eligibility, from service/profile's tables.
export type ClaimantContext = {
  userStatus: string;
  orgType: string;
  orgStatus: string;
};

@Injectable()
export class RequestsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(
    values: NewListingRequest,
    executor: Database = this.db,
  ): Promise<ListingRequest> {
    const [created] = await executor
      .insert(requests)
      .values(values)
      .returning();
    return created;
  }

  // Idempotency is scoped to the claiming org.
  async findByIdempotencyKey(
    rescueOrgId: string,
    idempotencyKey: string,
  ): Promise<ListingRequest | undefined> {
    const [found] = await this.db
      .select()
      .from(requests)
      .where(
        and(
          eq(requests.rescueOrgId, rescueOrgId),
          eq(requests.idempotencyKey, idempotencyKey),
        ),
      );
    return found;
  }

  async findById(id: string): Promise<ListingRequest | undefined> {
    const [found] = await this.db
      .select()
      .from(requests)
      .where(eq(requests.id, id));
    return found;
  }

  findMany(
    query: QueryRequestsDto,
    viewer: AuthenticatedUser,
  ): Promise<ListingRequest[]> {
    const conditions = this.buildConditions(query, viewer);
    const sortColumn = requests[query.sortBy ?? 'requestedAt'];
    const order =
      query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    return this.db
      .select()
      .from(requests)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(query.limit ?? 20)
      .offset(query.offset ?? 0);
  }

  async countMany(
    query: QueryRequestsDto,
    viewer: AuthenticatedUser,
  ): Promise<number> {
    const conditions = this.buildConditions(query, viewer);
    const [row] = await this.db
      .select({ value: count() })
      .from(requests)
      .where(conditions.length ? and(...conditions) : undefined);
    return row.value;
  }

  // Excludes soft-deleted listings, same as ListingsRepository.
  async findListingById(id: string): Promise<RequestedListing | undefined> {
    const [listing] = await this.db
      .select({
        id: listings.id,
        donorOrgId: listings.donorOrgId,
        status: listings.status,
        description: listings.description,
        quantity: listings.quantity,
        unit: listings.unit,
        pickupLocation: listings.pickupLocation,
        pickupWindowStart: listings.pickupWindowStart,
        pickupWindowEnd: listings.pickupWindowEnd,
      })
      .from(listings)
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)));
    return listing;
  }

  // Contact details for the given org ids, for addressing notifications.
  async findOrgContacts(ids: string[]): Promise<OrgContact[]> {
    if (ids.length === 0) return [];
    return this.db
      .select({
        id: organisations.id,
        name: organisations.name,
        contactEmail: organisations.contactEmail,
      })
      .from(organisations)
      .where(inArray(organisations.id, ids));
  }

  // Atomically claims the active claims due a one-shot pickup reminder and
  // stamps the marker, so a concurrent tick can't double-send. `opening`:
  // window opens within `leadMs` and hasn't yet. `closing`: window is open
  // and closes within `leadMs`.
  async markDuePickupReminders(
    phase: PickupReminderPhase,
    now: Date,
    leadMs: number,
  ): Promise<{ id: string; listingId: string }[]> {
    const horizon = new Date(now.getTime() + leadMs);
    const sentCol =
      phase === 'opening'
        ? requests.pickupOpenReminderSentAt
        : requests.pickupCloseReminderSentAt;
    const due =
      phase === 'opening'
        ? and(
            isNotNull(listings.pickupWindowStart),
            gt(listings.pickupWindowStart, now),
            lte(listings.pickupWindowStart, horizon),
          )
        : and(
            isNotNull(listings.pickupWindowStart),
            isNotNull(listings.pickupWindowEnd),
            lte(listings.pickupWindowStart, now),
            gt(listings.pickupWindowEnd, now),
            lte(listings.pickupWindowEnd, horizon),
          );

    const dueIds = this.db
      .select({ id: requests.id })
      .from(requests)
      .innerJoin(listings, eq(listings.id, requests.listingId))
      .where(and(eq(requests.status, 'active'), isNull(sentCol), due));

    return this.db
      .update(requests)
      .set(
        phase === 'opening'
          ? { pickupOpenReminderSentAt: now, updatedAt: now }
          : { pickupCloseReminderSentAt: now, updatedAt: now },
      )
      .where(and(inArray(requests.id, dueIds), isNull(sentCol)))
      .returning({ id: requests.id, listingId: requests.listingId });
  }

  // Listing + both parties' contact emails for the given claim ids.
  async findPickupReminderTargets(
    claimIds: string[],
  ): Promise<PickupReminderTarget[]> {
    if (claimIds.length === 0) return [];
    const donor = alias(organisations, 'donor');
    const rescue = alias(organisations, 'rescue');
    return this.db
      .select({
        listingDescription: listings.description,
        pickupLocation: listings.pickupLocation,
        pickupWindowStart: listings.pickupWindowStart,
        pickupWindowEnd: listings.pickupWindowEnd,
        rescueEmail: rescue.contactEmail,
        donorEmail: donor.contactEmail,
      })
      .from(requests)
      .innerJoin(listings, eq(listings.id, requests.listingId))
      .innerJoin(donor, eq(donor.id, listings.donorOrgId))
      .innerJoin(rescue, eq(rescue.id, requests.rescueOrgId))
      .where(inArray(requests.id, claimIds));
  }

  // Whether the caller may claim now: active account, approved rescue-partner
  // org. Undefined if the user row is missing.
  async findClaimantContext(
    userId: string,
  ): Promise<ClaimantContext | undefined> {
    const [row] = await this.db
      .select({
        userStatus: users.status,
        orgType: organisations.type,
        orgStatus: organisations.status,
      })
      .from(users)
      .leftJoin(organisations, eq(users.orgId, organisations.id))
      .where(eq(users.id, userId));
    if (!row) return undefined;
    return {
      userStatus: row.userStatus,
      orgType: row.orgType ?? '',
      orgStatus: row.orgStatus ?? '',
    };
  }

  // Atomically flips the listing `available -> reserved` (bumping version).
  // Returns undefined if another claim got there first - the caller treats
  // that as a 409. Runs in the claim insert's transaction.
  async reserveListingForClaim(
    listingId: string,
    executor: Database = this.db,
  ): Promise<RequestedListing | undefined> {
    const [updated] = await executor
      .update(listings)
      .set({
        status: 'reserved',
        version: sql`${listings.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(listings.id, listingId),
          eq(listings.status, 'available'),
          isNull(listings.deletedAt),
        ),
      )
      .returning({
        id: listings.id,
        donorOrgId: listings.donorOrgId,
        status: listings.status,
        description: listings.description,
        quantity: listings.quantity,
        unit: listings.unit,
        pickupLocation: listings.pickupLocation,
        pickupWindowStart: listings.pickupWindowStart,
        pickupWindowEnd: listings.pickupWindowEnd,
      });
    return updated;
  }

  // Optimistic concurrency: only updates the row still at `expectedStatus`;
  // returns undefined if it moved on. Optional executor for transactions.
  async updateStatus(
    id: string,
    expectedStatus: ListingRequest['status'],
    values: ListingRequestUpdate,
    executor: Database = this.db,
  ): Promise<ListingRequest | undefined> {
    const [updated] = await executor
      .update(requests)
      .set(values)
      .where(and(eq(requests.id, id), eq(requests.status, expectedStatus)))
      .returning();
    return updated;
  }

  // Atomically bumps the failed-verify counter for a still-active claim and
  // returns the new count; undefined if the claim moved on.
  async incrementPickupCodeAttempts(
    id: string,
    now: Date,
    executor: Database = this.db,
  ): Promise<number | undefined> {
    const [row] = await executor
      .update(requests)
      .set({
        pickupCodeAttempts: sql`${requests.pickupCodeAttempts} + 1`,
        updatedAt: now,
      })
      .where(and(eq(requests.id, id), eq(requests.status, 'active')))
      .returning({ pickupCodeAttempts: requests.pickupCodeAttempts });
    return row?.pickupCodeAttempts;
  }

  // Closes a reserved listing out to `collected` once its claim is verified.
  // One atomic statement so a concurrent cancel (listing back to
  // `available`) is left alone.
  async markListingCollectedIfDone(
    listingId: string,
    executor: Database = this.db,
  ): Promise<boolean> {
    const stillActive = executor
      .select({ id: requests.id })
      .from(requests)
      .where(
        and(eq(requests.listingId, listingId), eq(requests.status, 'active')),
      );

    const [updated] = await executor
      .update(listings)
      .set({
        status: 'collected',
        version: sql`${listings.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(listings.id, listingId),
          eq(listings.status, 'reserved'),
          notExists(stillActive),
        ),
      )
      .returning({ id: listings.id });
    return !!updated;
  }

  // Reverses reserveListingForClaim when a claim is cancelled or ends in a
  // no-show: `reserved -> available`. Leaves any other status untouched.
  async reopenListingAfterClaimEnded(
    listingId: string,
    executor: Database = this.db,
  ): Promise<void> {
    await executor
      .update(listings)
      .set({
        status: sql`case when ${listings.status} = 'reserved' then 'available'::listing_status else ${listings.status} end`,
        version: sql`${listings.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(listings.id, listingId), isNull(listings.deletedAt)));
  }

  private buildConditions(
    query: QueryRequestsDto,
    viewer: AuthenticatedUser,
  ): SQL[] {
    const conditions: SQL[] = [];
    // A viewer sees only claims they filed or claims on listings they
    // donated; admins see all; an org-less viewer sees none.
    if (viewer.role !== 'admin') {
      conditions.push(
        viewer.orgId
          ? or(
              eq(requests.rescueOrgId, viewer.orgId),
              inArray(
                requests.listingId,
                this.db
                  .select({ id: listings.id })
                  .from(listings)
                  .where(eq(listings.donorOrgId, viewer.orgId)),
              ),
            )!
          : sql`false`,
      );
    }
    if (query.status) conditions.push(eq(requests.status, query.status));
    if (query.listingId)
      conditions.push(eq(requests.listingId, query.listingId));
    return conditions;
  }
}
