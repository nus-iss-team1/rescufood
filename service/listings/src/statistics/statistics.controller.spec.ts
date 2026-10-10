import type { Request } from 'express';
import type { AuthenticatedUser } from '../common/types/express';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

// Same reason as listings.controller.spec.ts: the guard imports `jose`,
// which this project's ts-jest config can't parse as real ESM.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

const user: AuthenticatedUser = {
  userId: 'user-1',
  role: 'user',
  orgId: 'org-1',
};

function makeController() {
  const service = {
    getOrgSummary: jest.fn().mockResolvedValue({ orgId: 'org-1' }),
    getRescuedMetrics: jest.fn().mockResolvedValue({ orgId: 'org-1' }),
  };
  const controller = new StatisticsController(
    service as unknown as StatisticsService,
  );
  return { controller, service };
}

describe('StatisticsController', () => {
  it('delegates the summary to the service with the caller and period', async () => {
    const { controller, service } = makeController();
    const filters = { from: '2026-03-01', to: '2026-03-31' };

    const result = await controller.getOrgSummary({ user } as Request, filters);

    expect(service.getOrgSummary).toHaveBeenCalledWith(user, filters);
    expect(result).toEqual({ orgId: 'org-1' });
  });

  it('delegates the metrics to the service with the caller and period', async () => {
    const { controller, service } = makeController();
    const filters = { from: '2026-03-01' };

    const result = await controller.getRescuedMetrics(
      { user } as Request,
      filters,
    );

    expect(service.getRescuedMetrics).toHaveBeenCalledWith(user, filters);
    expect(result).toEqual({ orgId: 'org-1' });
  });
});
