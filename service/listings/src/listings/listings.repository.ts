import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
  type Column,
  type SQL,
} from 'drizzle-orm';
import type { AuthenticatedUser } from '../common/types/express';
import { DATABASE, type Database } from '../db/db.module';
import { organisations } from '../db/external.schema';
import { listings, requests } from '../db/schema';
import type { QueryListingsDto } from './dto/query-listings.dto';

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type ListingUpdate = Partial<NewListing>;

@Injectable()
export class ListingsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(values: NewListing): Promise<Listing> {
    const [created] = await this.db.insert(listings).values(values).returning();
    return created;
  }

  findMany(
    query: QueryListingsDto,
    viewer: AuthenticatedUser,
  ): Promise<Listing[]> {
    const conditions = this.buildConditions(query, viewer);
    const sortColumn = listings[query.sortBy ?? 'useBy'];
    const order =
      query.sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

    return this.db
      .select()
      .from(listings)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(query.limit ?? 20)
      .offset(query.offset ?? 0);
  }

  // Paired with findMany against the same filters (ignoring limit/offset) so
  // callers can render pagination controls without a second round trip of
  // their own. Kept as a separate query rather than a window function since
  // findMany's caller (ListingsService.findAll) already runs both in
  // parallel via Promise.all.
  async countMany(
    query: QueryListingsDto,
    viewer: AuthenticatedUser,
  ): Promise<number> {
    const conditions = this.buildConditions(query, viewer);
    const [row] = await this.db
      .select({ value: count() })
      .from(listings)
      .where(conditions.length ? and(...conditions) : undefined);
    return row.value;
  }

  async findById(id: string): Promise<Listing | undefined> {
    const [listing] = await this.db
      .select()
      .from(listings)
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)));
    return listing;
  }

  // Optimistic concurrency: only the row still at `expectedVersion` gets
  // updated. Returns undefined if it moved on since (or never existed) -
  // the caller decides what that means (404 vs 409). Accepts an optional
  // transaction so ListingsService.update can apply this atomically
  // alongside listing_images changes (see listing-images.repository.ts).
  // Also excludes soft-deleted rows, so a stale edit can't resurrect a
  // listing that was deleted after it was read.
  async updateWithVersion(
    id: string,
    expectedVersion: number,
    values: ListingUpdate,
    executor: Database = this.db,
  ): Promise<Listing | undefined> {
    const [updated] = await executor
      .update(listings)
      .set(values)
      .where(
        and(
          eq(listings.id, id),
          eq(listings.version, expectedVersion),
          isNull(listings.deletedAt),
        ),
      )
      .returning();
    return updated;
  }

  // Soft delete: marks the row gone (excluded from every read path above)
  // instead of removing it, and bumps `version` like any other mutation so
  // a concurrent update racing against this one gets a 409 rather than
  // silently reviving the listing. Scoped to `deletedAt IS NULL` so a
  // double-delete is a no-op (returns undefined) rather than clobbering the
  // original deletedAt/version.
  async delete(id: string, nextVersion: number): Promise<Listing | undefined> {
    const [deleted] = await this.db
      .update(listings)
      .set({
        deletedAt: new Date(),
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
      .returning();
    return deleted;
  }

  // Existence check backing the "can't delete a listing with associated
  // requests" rule in ListingsService.remove - now that delete is a plain
  // UPDATE, it no longer trips the requests->listings FK the way a hard
  // DELETE used to, so this has to be enforced explicitly.
  async countAssociatedRequests(listingId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(requests)
      .where(eq(requests.listingId, listingId));
    return row.value;
  }

  // Cascades a donor cancelling the listing outright onto its requests: the
  // donor isn't giving anything out anymore, so every request still in play
  // (pending, or already accepted and awaiting pickup) becomes superseded -
  // not declined/cancelled, since neither party *to the request* is the one
  // who backed out. Terminal requests (declined/cancelled/completed/
  // no_show/expired/already-superseded) are untouched. Only ever called
  // against a `draft`/`available` listing (see ALLOWED_TRANSITIONS in
  // listing-status.util.ts - `reserved`/`collected` listings can't be
  // cancelled through this endpoint), so remaining_quantity bookkeeping
  // doesn't matter here: the listing itself is dead either way.
  async supersedeRequestsForListing(
    listingId: string,
    executor: Database = this.db,
  ): Promise<number> {
    const result = await executor
      .update(requests)
      .set({ status: 'superseded', updatedAt: new Date() })
      .where(
        and(
          eq(requests.listingId, listingId),
          inArray(requests.status, ['pending', 'accepted']),
        ),
      )
      .returning({ id: requests.id });
    return result.length;
  }

  // Backs the expiry sweep (ListingExpiryService): flips any listing still
  // `available` once its pickup window has closed - i.e. nobody's request
  // was accepted in time, or it was only ever partially claimed - to
  // `expired`, and in the same transaction expires any of its requests
  // still open (`pending`/`accepted`) so they stop pointing at a dead
  // listing instead of sitting there forever. A fully `reserved` listing
  // (claimed down to zero) is deliberately out of scope here - whether an
  // accepted-but-uncollected request on one becomes `no_show` or something
  // else is a call for the pickup-verification flow, not a time-based
  // sweep. Scoped to `available` to match listings_expiry_scan_idx exactly,
  // and bumps `version` like every other mutation so a donor's in-flight
  // optimistic update racing against this sweep gets a 409 instead of
  // silently overwriting `expired` back.
  async expireOverdue(
    now: Date = new Date(),
  ): Promise<{ expiredListings: number; expiredRequests: number }> {
    return this.db.transaction(async (tx) => {
      const expired = await tx
        .update(listings)
        .set({
          status: 'expired',
          version: sql`${listings.version} + 1`,
          updatedAt: now,
        })
        .where(
          and(
            eq(listings.status, 'available'),
            lte(listings.pickupWindowEnd, now),
            isNull(listings.deletedAt),
          ),
        )
        .returning({ id: listings.id });

      if (expired.length === 0) {
        return { expiredListings: 0, expiredRequests: 0 };
      }

      const expiredRequests = await tx
        .update(requests)
        .set({ status: 'expired', updatedAt: now })
        .where(
          and(
            inArray(
              requests.listingId,
              expired.map((listing) => listing.id),
            ),
            inArray(requests.status, ['pending', 'accepted']),
          ),
        )
        .returning({ id: requests.id });

      return {
        expiredListings: expired.length,
        expiredRequests: expiredRequests.length,
      };
    });
  }

  private buildConditions(
    query: QueryListingsDto,
    viewer: AuthenticatedUser,
  ): SQL[] {
    const conditions: SQL[] = [isNull(listings.deletedAt)];
    // Search/discovery only surfaces available listings for orgs that don't
    // own them - reserved/collected/etc. listings a rescue org already has
    // via a request are looked up individually instead (findOne / GET :id),
    // not through this endpoint. See isListingVisible in
    // listing-access.util.ts for that single-listing equivalent, which stays
    // broader (any non-draft status). Admins see everything here too.
    if (viewer.role !== 'admin') {
      conditions.push(
        viewer.orgId
          ? or(
              eq(listings.status, 'available'),
              eq(listings.donorOrgId, viewer.orgId),
            )!
          : eq(listings.status, 'available'),
      );
    }
    if (query.status) conditions.push(eq(listings.status, query.status));
    if (query.category) conditions.push(eq(listings.category, query.category));
    if (query.pickupLocation)
      conditions.push(
        ilike(listings.pickupLocation, `%${query.pickupLocation}%`),
      );
    if (query.donorOrgName)
      conditions.push(
        inArray(
          listings.donorOrgId,
          this.db
            .select({ id: organisations.id })
            .from(organisations)
            .where(ilike(organisations.name, query.donorOrgName)),
        ),
      );
    conditions.push(
      ...dateRange(listings.useBy, query.useByFrom, query.useByTo),
      ...dateRange(
        listings.pickupWindowStart,
        query.pickupWindowStartFrom,
        query.pickupWindowStartTo,
      ),
      ...dateRange(
        listings.pickupWindowEnd,
        query.pickupWindowEndFrom,
        query.pickupWindowEndTo,
      ),
      ...dateRange(listings.createdAt, query.createdAtFrom, query.createdAtTo),
    );
    return conditions;
  }
}

function dateRange<TColumn extends Column>(
  column: TColumn,
  from: string | undefined,
  to: string | undefined,
): SQL[] {
  const conditions: SQL[] = [];
  if (from) conditions.push(gte(column, new Date(from)));
  if (to) conditions.push(lte(column, new Date(to)));
  return conditions;
}
