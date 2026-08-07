import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { AuthenticatedUser } from '../common/types/express';
import { DATABASE, type Database } from '../db/db.module';
import { listings, requests } from '../db/schema';
import type { QueryRequestsDto } from './dto/query-requests.dto';

export type ListingRequest = typeof requests.$inferSelect;
export type NewListingRequest = typeof requests.$inferInsert;
export type ListingRequestUpdate = Partial<NewListingRequest>;

// Narrow projection of the listing a request points at - just enough for
// the access checks and quantity math in RequestsService, not the full
// Listing shape ListingsRepository deals in.
export type RequestedListing = {
  id: string;
  donorOrgId: string;
  status: (typeof listings.$inferSelect)['status'];
  remainingQuantity: string;
  unit: string;
};

@Injectable()
export class RequestsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(values: NewListingRequest): Promise<ListingRequest> {
    const [created] = await this.db.insert(requests).values(values).returning();
    return created;
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<ListingRequest | undefined> {
    const [found] = await this.db
      .select()
      .from(requests)
      .where(eq(requests.idempotencyKey, idempotencyKey));
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

  // Only the columns RequestsService needs to check visibility/eligibility -
  // deliberately not the full listings row (that's ListingsRepository's
  // concern). Excludes soft-deleted listings, same as ListingsRepository.
  async findListingById(id: string): Promise<RequestedListing | undefined> {
    const [listing] = await this.db
      .select({
        id: listings.id,
        donorOrgId: listings.donorOrgId,
        status: listings.status,
        remainingQuantity: listings.remainingQuantity,
        unit: listings.unit,
      })
      .from(listings)
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)));
    return listing;
  }

  // Optimistic concurrency without a version column: requests have none, so
  // this CASes on the status the caller read instead - only the row still
  // at `expectedStatus` gets updated. Returns undefined if it moved on since
  // (or never existed), same contract as ListingsRepository.updateWithVersion.
  // Accepts an optional transaction so RequestsService.decide can apply this
  // atomically alongside the listing quantity adjustment below.
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

  // Atomically decrements remaining_quantity and, if that empties the
  // listing, flips it straight to `reserved` in the same statement (no
  // separate read-then-write that a concurrent accept could race between).
  // Scoped to `status = 'available'` so a listing no longer accepting
  // requests can't be decremented. The `remaining_quantity_non_negative`
  // check constraint is the hard backstop against overselling under
  // concurrent accepts: if `quantity` exceeds what's left, Postgres rejects
  // the whole UPDATE rather than letting it go negative - callers should
  // treat that as a 409, not a 500.
  async decrementListingQuantity(
    listingId: string,
    quantity: string,
    executor: Database = this.db,
  ): Promise<RequestedListing | undefined> {
    const [updated] = await executor
      .update(listings)
      .set({
        remainingQuantity: sql`${listings.remainingQuantity} - ${quantity}`,
        status: sql`case when ${listings.remainingQuantity} - ${quantity} = 0 then 'reserved'::listing_status else ${listings.status} end`,
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
        remainingQuantity: listings.remainingQuantity,
        unit: listings.unit,
      });
    return updated;
  }

  // Atomically bumps the failed-verify-attempt counter for a request still
  // `accepted` and returns the new count, so RequestsService.verifyPickupCode
  // can enforce MAX_PICKUP_CODE_ATTEMPTS without a lost-update race between
  // two concurrent wrong guesses (a read-then-write of the count would let
  // both land on the same "3" and miscount). Returns undefined if the
  // request moved on since (e.g. cancelled mid-verify).
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
      .where(and(eq(requests.id, id), eq(requests.status, 'accepted')))
      .returning({ pickupCodeAttempts: requests.pickupCodeAttempts });
    return row?.pickupCodeAttempts;
  }

  // Reverses decrementListingQuantity for a cancelled accepted request. Only
  // reopens the listing (reserved -> available) - if it's already
  // cancelled/expired by the time this runs, it stays that way; the quantity
  // still gets restored for the record.
  async incrementListingQuantity(
    listingId: string,
    quantity: string,
    executor: Database = this.db,
  ): Promise<void> {
    await executor
      .update(listings)
      .set({
        remainingQuantity: sql`${listings.remainingQuantity} + ${quantity}`,
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
    // Requests aren't publicly browsable - a viewer only sees requests they
    // filed (as the rescue org) or that target a listing they donated (as
    // the donor org). Admins see everything; a viewer with no org at all
    // sees nothing, same spirit as isRequestVisible in request-access.util.ts.
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
