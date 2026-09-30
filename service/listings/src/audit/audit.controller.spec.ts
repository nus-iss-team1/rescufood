import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

// Same reason as summary.controller.spec.ts: the guard imports `jose`,
// which this project's ts-jest config can't parse as real ESM.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

describe('AuditController', () => {
  it('delegates to the service with the path and query', async () => {
    const service = {
      getEntityHistory: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      listEvents: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const controller = new AuditController(service as unknown as AuditService);

    const result = await controller.getEntityHistory(
      { entityType: 'listing', entityId: 'l1' },
      { limit: 10, offset: 0 },
    );

    expect(service.getEntityHistory).toHaveBeenCalledWith('listing', 'l1', {
      limit: 10,
      offset: 0,
    });
    expect(result).toEqual({ items: [], total: 0 });
  });

  it('delegates the feed to the service with the query', async () => {
    const service = {
      getEntityHistory: jest.fn(),
      listEvents: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const controller = new AuditController(service as unknown as AuditService);

    const result = await controller.listEvents({ entityType: 'claim' });

    expect(service.listEvents).toHaveBeenCalledWith({ entityType: 'claim' });
    expect(result).toEqual({ items: [], total: 0 });
  });
});
