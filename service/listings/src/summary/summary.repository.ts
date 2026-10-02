import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, isNull, or, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { listings, requests } from '../db/schema';
import type { StatusCount } from './common/status-tally.util';

export type OrgCounts = {
  listings: StatusCount[];
  claims: StatusCount[];
  asOf: Date;
};

@Injectable()
export class SummaryRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // Both aggregates and the timestamp are read inside one read-only
  // repeatable-read transaction, so the two counts can never straddle a
  // commit and `asOf` names the single snapshot they came from.
  countsForOrg(orgId: string): Promise<OrgCounts> {
    return this.db.transaction(
      async (tx) => {
        const listingRows = await tx
          .select({ status: listings.status, count: count() })
          .from(listings)
          .where(
            and(eq(listings.donorOrgId, orgId), isNull(listings.deletedAt)),
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
            or(eq(requests.rescueOrgId, orgId), eq(listings.donorOrgId, orgId)),
          )
          .groupBy(requests.status);

        const stamped = await tx.execute<{ as_of: Date }>(
          sql`select transaction_timestamp() as as_of`,
        );

        return {
          listings: listingRows,
          claims: claimRows,
          asOf: stamped.rows[0].as_of,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
}
