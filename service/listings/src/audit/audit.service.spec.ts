import { AuditRepository, type AuditEvent } from './audit.repository';
import { AuditService } from './audit.service';

const event = (over: Partial<AuditEvent> = {}): AuditEvent => ({
  id: 'a1',
  userId: 'u1',
  orgId: 'o1',
  action: 'listing.created',
  entityType: 'listing',
  entityId: 'l1',
  reason: '',
  metadata: { status: 'draft' },
  createdAt: new Date('2026-01-01T00:00:00Z'),
  ...over,
});

function make(page: { items: AuditEvent[]; total: number }) {
  const repository = {
    findByEntity: jest.fn().mockResolvedValue(page),
    findMany: jest.fn().mockResolvedValue(page),
  };
  return {
    repository,
    service: new AuditService(repository as unknown as AuditRepository),
  };
}

describe('AuditService', () => {
  it('returns the page with its total', async () => {
    const { service } = make({ items: [event()], total: 3 });

    const result = await service.getEntityHistory('listing', 'l1', {});

    expect(result.total).toBe(3);
    expect(result.items).toEqual([
      {
        id: 'a1',
        userId: 'u1',
        orgId: 'o1',
        action: 'listing.created',
        entityType: 'listing',
        entityId: 'l1',
        reason: '',
        metadata: { status: 'draft' },
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);
  });

  it('defaults the page window and leaves the filters unset', async () => {
    const { service, repository } = make({ items: [], total: 0 });

    await service.getEntityHistory('claim', 'c1', {});

    expect(repository.findByEntity).toHaveBeenCalledWith('claim', 'c1', {
      userId: undefined,
      createdAtFrom: undefined,
      createdAtTo: undefined,
      limit: 50,
      offset: 0,
    });
  });

  it('passes an explicit page window through', async () => {
    const { service, repository } = make({ items: [], total: 0 });

    await service.getEntityHistory('listing', 'l1', { limit: 10, offset: 20 });

    expect(repository.findByEntity).toHaveBeenCalledWith(
      'listing',
      'l1',
      expect.objectContaining({ limit: 10, offset: 20 }),
    );
  });

  it('passes the actor and timestamp filters through', async () => {
    const { service, repository } = make({ items: [], total: 0 });

    await service.getEntityHistory('listing', 'l1', {
      userId: 'u1',
      createdAtFrom: '2026-01-01T00:00:00.000Z',
      createdAtTo: '2026-01-31T23:59:59.000Z',
    });

    expect(repository.findByEntity).toHaveBeenCalledWith(
      'listing',
      'l1',
      expect.objectContaining({
        userId: 'u1',
        createdAtFrom: '2026-01-01T00:00:00.000Z',
        createdAtTo: '2026-01-31T23:59:59.000Z',
      }),
    );
  });

  it('carries a system event through with a null actor', async () => {
    const { service } = make({
      items: [event({ userId: null, orgId: null, action: 'claim.expired' })],
      total: 1,
    });

    const result = await service.getEntityHistory('claim', 'c1', {});

    expect(result.items[0]).toMatchObject({
      userId: null,
      orgId: null,
      action: 'claim.expired',
    });
  });

  it('lists the feed with no filters set', async () => {
    const { service, repository } = make({ items: [], total: 0 });

    await service.listEvents({});

    expect(repository.findMany).toHaveBeenCalledWith({
      entityType: undefined,
      userId: undefined,
      createdAtFrom: undefined,
      createdAtTo: undefined,
      limit: 50,
      offset: 0,
    });
  });

  it('passes the feed filters through', async () => {
    const { service, repository } = make({ items: [], total: 0 });

    await service.listEvents({
      entityType: 'claim',
      userId: 'u1',
      createdAtFrom: '2026-01-01T00:00:00.000Z',
      limit: 25,
      offset: 50,
    });

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'claim',
        userId: 'u1',
        createdAtFrom: '2026-01-01T00:00:00.000Z',
        limit: 25,
        offset: 50,
      }),
    );
  });

  it('maps feed rows the same way as entity history', async () => {
    const { service } = make({ items: [event()], total: 1 });

    const result = await service.listEvents({});

    expect(result.items[0]).toMatchObject({
      id: 'a1',
      action: 'listing.created',
      entityType: 'listing',
      entityId: 'l1',
    });
  });
});
