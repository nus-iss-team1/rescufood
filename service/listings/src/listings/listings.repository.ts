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
  type Column,
  type SQL,
} from 'drizzle-orm';
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

  findMany(query: QueryListingsDto): Promise<Listing[]> {
    const conditions = this.buildConditions(query);
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
      .set({ deletedAt: new Date(), version: nextVersion, updatedAt: new Date() })
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

  private buildConditions(query: QueryListingsDto): SQL[] {
    const conditions: SQL[] = [isNull(listings.deletedAt)];
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
