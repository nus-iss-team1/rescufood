import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/types/express';
import { SummaryRepository } from './summary.repository';
import { SummaryService } from './summary.service';

const asOf = new Date('2026-09-13T04:12:07.881Z');

function makeRepository() {
  return { countsForOrg: jest.fn() };
}

function makeService(repository: ReturnType<typeof makeRepository>) {
  return new SummaryService(repository as unknown as SummaryRepository);
}

const user: AuthenticatedUser = {
  userId: 'user-1',
  role: 'user',
  orgId: 'org-1',
};

describe('SummaryService', () => {
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

      expect(repository.countsForOrg).toHaveBeenCalledWith('org-1');
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

      expect(repository.countsForOrg).toHaveBeenCalledWith('org-1');
    });

    it('denies a caller with no organisation without counting anything', async () => {
      const repository = makeRepository();

      await expect(
        makeService(repository).getOrgSummary({ ...user, orgId: undefined }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.countsForOrg).not.toHaveBeenCalled();
    });
  });
});
