import type { Request } from 'express';
import type { AuthenticatedUser } from '../common/types/express';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';

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

describe('SummaryController', () => {
  it('delegates to the service with the caller', async () => {
    const service = {
      getOrgSummary: jest.fn().mockResolvedValue({ orgId: 'org-1' }),
    };
    const controller = new SummaryController(
      service as unknown as SummaryService,
    );

    const result = await controller.getOrgSummary({ user } as Request);

    expect(service.getOrgSummary).toHaveBeenCalledWith(user);
    expect(result).toEqual({ orgId: 'org-1' });
  });
});
