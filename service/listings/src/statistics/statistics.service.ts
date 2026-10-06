import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/types/express';
import { listingStatus, requestStatus } from '../db/schema';
import { toDateRange } from './common/date-range.util';
import { formatAmount, formatDuration } from './common/format.util';
import { tallyByStatus, type StatusTally } from './common/status-tally.util';
import type { StatsFiltersDto } from './dto/stats-filters.dto';
import { StatisticsRepository } from './statistics.repository';

export type OrgSummary = {
  orgId: string;
  listings: StatusTally<(typeof listingStatus.enumValues)[number]>;
  claims: StatusTally<(typeof requestStatus.enumValues)[number]>;
  asOf: Date;
};

export type UnitQuantity = {
  unit: string;
  amount: number;
  formattedAmount: string;
  lots: number;
};

export type RescuedMetrics = {
  orgId: string;
  rescuedByUnit: UnitQuantity[];
  lotsCollected: number;
  claimsCompleted: number;
  avgTimeToClaimMs: number | null;
  medianTimeToClaimMs: number | null;
  formattedAvgTimeToClaim: string;
  formattedMedianTimeToClaim: string;
  timeToClaimCount: number;
  asOf: Date;
};

@Injectable()
export class StatisticsService {
  constructor(private readonly statisticsRepository: StatisticsRepository) {}

  async getOrgSummary(
    user: AuthenticatedUser,
    filters: StatsFiltersDto = {},
  ): Promise<OrgSummary> {
    const orgId = requireOrgId(user);
    const counts = await this.statisticsRepository.countsForOrg(
      orgId,
      toDateRange(filters.from, filters.to),
    );
    return {
      orgId,
      listings: tallyByStatus(listingStatus.enumValues, counts.listings),
      claims: tallyByStatus(requestStatus.enumValues, counts.claims),
      asOf: counts.asOf,
    };
  }

  async getRescuedMetrics(
    user: AuthenticatedUser,
    filters: StatsFiltersDto = {},
  ): Promise<RescuedMetrics> {
    const orgId = requireOrgId(user);
    const { units, timing, asOf } =
      await this.statisticsRepository.metricsForOrg(
        orgId,
        toDateRange(filters.from, filters.to),
      );

    const rescuedByUnit = units
      .map((u) => {
        const amount = Number(u.amount);
        return {
          unit: u.unit,
          amount,
          formattedAmount: formatAmount(amount),
          lots: u.lots,
        };
      })
      .sort((a, b) => b.lots - a.lots || a.unit.localeCompare(b.unit));

    const avgMs = roundMs(timing.avgMs);
    const medianMs = roundMs(timing.medianMs);

    return {
      orgId,
      rescuedByUnit,
      lotsCollected: units.reduce((n, u) => n + u.lots, 0),
      claimsCompleted: units.reduce((n, u) => n + u.claims, 0),
      avgTimeToClaimMs: avgMs,
      medianTimeToClaimMs: medianMs,
      formattedAvgTimeToClaim: formatDuration(avgMs),
      formattedMedianTimeToClaim: formatDuration(medianMs),
      timeToClaimCount: timing.count,
      asOf,
    };
  }
}

// Always scoped to the caller's own org, admins included: organisation
// statistics are per-org figures, so there is no cross-org view of them to
// grant. ActiveOrgMemberGuard already rejects org-less callers - the check
// here is what makes that hold if a route is ever wired without it.
function requireOrgId(user: AuthenticatedUser): string {
  if (!user.orgId) {
    throw new ForbiddenException(
      'you must belong to an organisation to do this',
    );
  }
  return user.orgId;
}

function roundMs(ms: number | null): number | null {
  return ms === null ? null : Math.round(ms);
}
