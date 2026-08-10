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
  ne,
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

  // Backs the expiry sweep (ListingExpiryService): flips any listing still
  // `available` once its pickup window has closed - i.e. nobody's request
  // was accepted in time - to `expired`. Scoped to `available` to match
  // listings_expiry_scan_idx exactly, and bumps `version` like every other
  // mutation so a donor's in-flight optimistic update racing against this
  // sweep gets a 409 instead of silently overwriting `expired` back.
  async expireOverdue(now: Date = new Date()): Promise<number> {
    const result = await this.db
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
    return result.length;
  }

  private buildConditions(
    query: QueryListingsDto,
    viewer: AuthenticatedUser,
  ): SQL[] {
    const conditions: SQL[] = [isNull(listings.deletedAt)];
    // Draft listings are a donor org's private staging state - see
    // isListingVisible in listing-access.util.ts for the single-listing
    // equivalent of this rule. Admins see everything.
    if (viewer.role !== 'admin') {
      conditions.push(
        viewer.orgId
          ? or(
              ne(listings.status, 'draft'),
              eq(listings.donorOrgId, viewer.orgId),
            )!
          : ne(listings.status, 'draft'),
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
