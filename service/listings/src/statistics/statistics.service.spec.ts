import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/types/express';
import { StatisticsRepository } from './statistics.repository';
import { StatisticsService } from './statistics.service';

const asOf = new Date('2026-09-13T04:12:07.881Z');

function makeRepository() {
  return { countsForOrg: jest.fn(), metricsForOrg: jest.fn() };
}

function makeService(repository: ReturnType<typeof makeRepository>) {
  return new StatisticsService(repository as unknown as StatisticsRepository);
}

const user: AuthenticatedUser = {
  userId: 'user-1',
  role: 'user',
  orgId: 'org-1',
};

const noTiming = { count: 0, avgMs: null, medianMs: null };

describe('StatisticsService', () => {
  describe('getOrgSummary', () => {
    it('counts by lifecycle status for the caller org, zero-filling the rest', async () => {
      const repository = makeRepository();
      repository.countsForOrg.mockResolvedValue({
        listings: [
          { status: 'available', count: 2 },
          { status: 'collected', count: 4 },
        ],
        claims: [{ status: 'active', count: 1 }],
        asOf,
      });

      const summary = await makeService(repository).getOrgSummary(user);

      expect(repository.countsForOrg).toHaveBeenCalledWith('org-1', {});
      expect(summary).toEqual({
        orgId: 'org-1',
        listings: {
          draft: 0,
          available: 2,
          reserved: 0,
          collected: 4,
          expired: 0,
          cancelled: 0,
          total: 6,
        },
        claims: {
          active: 1,
          cancelled: 0,
          completed: 0,
          no_show: 0,
          expired: 0,
          total: 1,
        },
        asOf,
      });
    });

    it('counts over the Singapore days from `from` through `to`', async () => {
      const repository = makeRepository();
      repository.countsForOrg.mockResolvedValue({
        listings: [],
        claims: [],
        asOf,
      });

      await makeService(repository).getOrgSummary(user, {
        from: '2026-03-01',
        to: '2026-03-31',
      });

      expect(repository.countsForOrg).toHaveBeenCalledWith('org-1', {
        start: new Date('2026-02-28T16:00:00.000Z'),
        end: new Date('2026-03-31T16:00:00.000Z'),
      });
    });

    it("returns the repository's as-of timestamp unchanged", async () => {
      const repository = makeRepository();
      repository.countsForOrg.mockResolvedValue({
        listings: [],
        claims: [],
        asOf,
      });

      await expect(
        makeService(repository).getOrgSummary(user),
      ).resolves.toMatchObject({ asOf });
    });

    it('scopes an admin to their own org rather than the whole platform', async () => {
      const repository = makeRepository();
      repository.countsForOrg.mockResolvedValue({
        listings: [],
        claims: [],
        asOf,
      });

      await makeService(repository).getOrgSummary({ ...user, role: 'admin' });

      expect(repository.countsForOrg).toHaveBeenCalledWith('org-1', {});
    });

    it('denies a caller with no organisation without counting anything', async () => {
      const repository = makeRepository();

      await expect(
        makeService(repository).getOrgSummary({ ...user, orgId: undefined }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.countsForOrg).not.toHaveBeenCalled();
    });
  });

  describe('getRescuedMetrics', () => {
    it('shapes per-unit totals, most lots first, and totals them', async () => {
      const repository = makeRepository();
      repository.metricsForOrg.mockResolvedValue({
        units: [
          { unit: 'bottles', amount: '44.00', lots: 1, claims: 1 },
          { unit: 'kg', amount: '1250.50', lots: 3, claims: 4 },
        ],
        timing: { count: 4, avgMs: 7_200_000, medianMs: 6_300_000 },
        asOf,
      });

      const metrics = await makeService(repository).getRescuedMetrics(user);

      expect(repository.metricsForOrg).toHaveBeenCalledWith('org-1', {});
      expect(metrics).toEqual({
        orgId: 'org-1',
        rescuedByUnit: [
          { unit: 'kg', amount: 1250.5, formattedAmount: '1,250.5', lots: 3 },
          { unit: 'bottles', amount: 44, formattedAmount: '44', lots: 1 },
        ],
        lotsCollected: 4,
        claimsCompleted: 5,
        avgTimeToClaimMs: 7_200_000,
        medianTimeToClaimMs: 6_300_000,
        formattedAvgTimeToClaim: '2 hrs',
        formattedMedianTimeToClaim: '1 hr 45 mins',
        timeToClaimCount: 4,
        asOf,
      });
    });

    it('reads metrics over the Singapore days from `from` through `to`', async () => {
      const repository = makeRepository();
      repository.metricsForOrg.mockResolvedValue({
        units: [],
        timing: noTiming,
        asOf,
      });

      await makeService(repository).getRescuedMetrics(user, {
        from: '2026-03-01',
      });

      expect(repository.metricsForOrg).toHaveBeenCalledWith('org-1', {
        start: new Date('2026-02-28T16:00:00.000Z'),
        end: undefined,
      });
    });

    it('breaks a tie on lots by unit name', async () => {
      const repository = makeRepository();
      repository.metricsForOrg.mockResolvedValue({
        units: [
          { unit: 'trays', amount: '2.00', lots: 1, claims: 1 },
          { unit: 'boxes', amount: '5.00', lots: 1, claims: 1 },
        ],
        timing: noTiming,
        asOf,
      });

      const metrics = await makeService(repository).getRescuedMetrics(user);

      expect(metrics.rescuedByUnit.map((u) => u.unit)).toEqual([
        'boxes',
        'trays',
      ]);
    });

    it('rounds durations to whole milliseconds', async () => {
      const repository = makeRepository();
      repository.metricsForOrg.mockResolvedValue({
        units: [],
        timing: { count: 3, avgMs: 1_000.4999, medianMs: 2_000.5 },
        asOf,
      });

      const metrics = await makeService(repository).getRescuedMetrics(user);

      expect(metrics.avgTimeToClaimMs).toBe(1_000);
      expect(metrics.medianTimeToClaimMs).toBe(2_001);
    });

    it('returns empty totals and no durations when nothing qualifies', async () => {
      const repository = makeRepository();
      repository.metricsForOrg.mockResolvedValue({
        units: [],
        timing: noTiming,
        asOf,
      });

      const metrics = await makeService(repository).getRescuedMetrics(user);

      expect(metrics).toEqual({
        orgId: 'org-1',
        rescuedByUnit: [],
        lotsCollected: 0,
        claimsCompleted: 0,
        avgTimeToClaimMs: null,
        medianTimeToClaimMs: null,
        formattedAvgTimeToClaim: '--',
        formattedMedianTimeToClaim: '--',
        timeToClaimCount: 0,
        asOf,
      });
    });

    it('scopes an admin to their own org rather than the whole platform', async () => {
      const repository = makeRepository();
      repository.metricsForOrg.mockResolvedValue({
        units: [],
        timing: noTiming,
        asOf,
      });

      await makeService(repository).getRescuedMetrics({
        ...user,
        role: 'admin',
      });

      expect(repository.metricsForOrg).toHaveBeenCalledWith('org-1', {});
    });

    it('denies a caller with no organisation without reading anything', async () => {
      const repository = makeRepository();

      await expect(
        makeService(repository).getRescuedMetrics({
          ...user,
          orgId: undefined,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.metricsForOrg).not.toHaveBeenCalled();
    });
  });
});
