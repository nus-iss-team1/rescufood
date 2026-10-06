import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '../audit/audit.actions';
import { AuditRepository } from '../audit/audit.repository';
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
  constructor(
    private readonly statisticsRepository: StatisticsRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async getOrgSummary(
    user: AuthenticatedUser,
    filters: StatsFiltersDto = {},
  ): Promise<OrgSummary> {
    const orgId = await this.targetOrgId(user, filters);
    const counts = await this.statisticsRepository.countsForOrg(
      orgId,
      toDateRange(filters.from, filters.to),
    );
    await this.recordFilteredView(
      user,
      orgId,
      AuditAction.StatsSummaryViewed,
      filters,
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
    const orgId = await this.targetOrgId(user, filters);
    const { units, timing, asOf } =
      await this.statisticsRepository.metricsForOrg(
        orgId,
        toDateRange(filters.from, filters.to),
      );
    await this.recordFilteredView(
      user,
      orgId,
      AuditAction.StatsMetricsViewed,
      filters,
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

  // Filtered reads are audited against the org reported on; the default dashboard view is not.
  private async recordFilteredView(
    user: AuthenticatedUser,
    orgId: string,
    action: string,
    filters: StatsFiltersDto,
  ): Promise<void> {
    if (!filters.from && !filters.to && !filters.orgId) return;
    await this.auditRepository.record({
      actor: { userId: user.userId, orgId: user.orgId ?? null },
      action,
      entityType: 'organisation',
      entityId: orgId,
      metadata: { from: filters.from ?? null, to: filters.to ?? null },
    });
  }

  // Admins belong to no org, so they name the one to report on; everyone else only gets their own.
  private async targetOrgId(
    user: AuthenticatedUser,
    filters: StatsFiltersDto,
  ): Promise<string> {
    if (user.role !== 'admin') {
      const ownOrgId = requireOrgId(user);
      if (filters.orgId && filters.orgId !== ownOrgId) {
        throw new ForbiddenException(
          "you can only view your own organisation's statistics",
        );
      }
      return ownOrgId;
    }
    if (!filters.orgId) {
      throw new BadRequestException('orgId is required for administrators');
    }
    if (!(await this.statisticsRepository.orgExists(filters.orgId))) {
      throw new NotFoundException(`organisation ${filters.orgId} not found`);
    }
    return filters.orgId;
  }
}

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
