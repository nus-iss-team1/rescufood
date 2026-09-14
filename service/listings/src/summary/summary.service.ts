import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/types/express';
import { listingStatus, requestStatus } from '../db/schema';
import { tallyByStatus, type StatusTally } from './common/status-tally.util';
import { SummaryRepository } from './summary.repository';

export type OrgSummary = {
  orgId: string;
  listings: StatusTally<(typeof listingStatus.enumValues)[number]>;
  claims: StatusTally<(typeof requestStatus.enumValues)[number]>;
  asOf: Date;
};

@Injectable()
export class SummaryService {
  constructor(private readonly summaryRepository: SummaryRepository) {}

  // Always scoped to the caller's own org, admins included: an organisation
  // summary is a per-org figure, so there is no cross-org view of it to
  // grant. OrgMembershipGuard already rejects org-less callers - the check
  // here is what makes that hold if the route is ever wired without it.
  async getOrgSummary(user: AuthenticatedUser): Promise<OrgSummary> {
    if (!user.orgId) {
      throw new ForbiddenException(
        'you must belong to an organisation to do this',
      );
    }

    const counts = await this.summaryRepository.countsForOrg(user.orgId);
    return {
      orgId: user.orgId,
      listings: tallyByStatus(listingStatus.enumValues, counts.listings),
      claims: tallyByStatus(requestStatus.enumValues, counts.claims),
      asOf: counts.asOf,
    };
  }
}
