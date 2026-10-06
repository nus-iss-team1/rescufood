import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  type Column,
  count,
  countDistinct,
  eq,
  gte,
  isNull,
  lt,
  or,
  sql,
} from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { organisations } from '../db/external.schema';
import { listings, requests } from '../db/schema';
import type { DateRange } from './common/date-range.util';
import type { StatusCount } from './common/status-tally.util';

export type OrgCounts = {
  listings: StatusCount[];
  claims: StatusCount[];
  asOf: Date;
};

export type UnitTotal = {
  unit: string;
  amount: string;
  lots: number;
  claims: number;
};

export type ClaimTiming = {
  count: number;
  avgMs: number | null;
  medianMs: number | null;
};

export type OrgMetrics = {
  units: UnitTotal[];
  timing: ClaimTiming;
  asOf: Date;
};

const READ_SNAPSHOT = {
  isolationLevel: 'repeatable read',
  accessMode: 'read only',
} as const;

@Injectable()
export class StatisticsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async orgExists(orgId: string): Promise<boolean> {
    const [org] = await this.db
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.id, orgId));
    return org !== undefined;
  }

  // Both aggregates and the timestamp are read inside one read-only
  // repeatable-read transaction, so the two counts can never straddle a
  // commit and `asOf` names the single snapshot they came from.
  countsForOrg(orgId: string, range: DateRange = {}): Promise<OrgCounts> {
    return this.db.transaction(async (tx) => {
      const listingRows = await tx
        .select({ status: listings.status, count: count() })
        .from(listings)
        .where(
          and(
            eq(listings.donorOrgId, orgId),
            isNull(listings.deletedAt),
            within(listings.createdAt, range),
          ),
        )
        .groupBy(listings.status);

      // Claims the org filed plus claims filed against listings it
      // donated - the same two-sided scope GET /requests applies, so the
      // summary reconciles with what that endpoint lists.
      const claimRows = await tx
        .select({ status: requests.status, count: count() })
        .from(requests)
        .innerJoin(listings, eq(requests.listingId, listings.id))
        .where(
          and(claimedByOrDonatedBy(orgId), within(requests.requestedAt, range)),
        )
        .groupBy(requests.status);

      return {
        listings: listingRows,
        claims: claimRows,
        asOf: await snapshotTime(tx),
      };
    }, READ_SNAPSHOT);
  }

  // Completed claims in the same two-sided scope as countsForOrg, read in one snapshot.
  metricsForOrg(orgId: string, range: DateRange = {}): Promise<OrgMetrics> {
    const completed = and(
      eq(requests.status, 'completed'),
      claimedByOrDonatedBy(orgId),
      within(requests.collectedAt, range),
    );
    const elapsedMs = sql`(extract(epoch from ${requests.requestedAt} - ${listings.publishedAt}) * 1000)::float8`;

    return this.db.transaction(async (tx) => {
      const units = await tx
        .select({
          unit: sql<string>`mode() within group (order by trim(${listings.unit}))`,
          amount: sql<string>`coalesce(sum(${requests.collectedQuantity}), 0)::text`,
          lots: countDistinct(requests.listingId),
          claims: count(),
        })
        .from(requests)
        .innerJoin(listings, eq(requests.listingId, listings.id))
        .where(completed)
        .groupBy(sql`lower(trim(${listings.unit}))`);

      // A null published_at fails the comparison, so drafts drop out with it.
      const [timing] = await tx
        .select({
          count: count(),
          avgMs: sql<number | null>`avg(${elapsedMs})`.mapWith(Number),
          medianMs: sql<
            number | null
          >`percentile_cont(0.5) within group (order by ${elapsedMs})`.mapWith(
            Number,
          ),
        })
        .from(requests)
        .innerJoin(listings, eq(requests.listingId, listings.id))
        .where(and(completed, gte(requests.requestedAt, listings.publishedAt)));

      return { units, timing, asOf: await snapshotTime(tx) };
    }, READ_SNAPSHOT);
  }
}

// Claims the org filed, plus claims filed against listings it donated.
function claimedByOrDonatedBy(orgId: string) {
  return or(eq(requests.rescueOrgId, orgId), eq(listings.donorOrgId, orgId));
}

// Restricts `column` to the range; an unbounded side adds no condition.
function within(column: Column, range: DateRange) {
  return and(
    range.start ? gte(column, range.start) : undefined,
    range.end ? lt(column, range.end) : undefined,
  );
}

async function snapshotTime(tx: Pick<Database, 'execute'>): Promise<Date> {
  const stamped = await tx.execute<{ as_of: Date }>(
    sql`select transaction_timestamp() as as_of`,
  );
  return stamped.rows[0].as_of;
}
