import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import type { Database } from '../db/db.module';
import { auditLog } from '../db/schema';
import { AuditRepository, SYSTEM_ACTOR } from './audit.repository';

function makeDb() {
  const values = jest.fn().mockResolvedValue(undefined);
  const insert = jest.fn(() => ({ values }));
  return { db: { insert } as unknown as Database, insert, values };
}

describe('AuditRepository', () => {
  it('inserts one audit_log row, defaulting reason and metadata', async () => {
    const { db, insert, values } = makeDb();
    const repository = new AuditRepository(db);

    await repository.record({
      actor: { userId: 'u1', orgId: 'o1' },
      action: 'listing.created',
      entityType: 'listing',
      entityId: 'l1',
    });

    expect(insert).toHaveBeenCalledWith(auditLog);
    expect(values).toHaveBeenCalledWith({
      userId: 'u1',
      orgId: 'o1',
      action: 'listing.created',
      entityType: 'listing',
      entityId: 'l1',
      reason: '',
      metadata: {},
    });
  });

  it('passes reason and metadata through and accepts the system actor', async () => {
    const { db, values } = makeDb();
    const repository = new AuditRepository(db);

    await repository.record({
      actor: SYSTEM_ACTOR,
      action: 'claim.expired',
      entityType: 'claim',
      entityId: 'c1',
      reason: 'pickup window closed',
      metadata: { listingId: 'l1' },
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        orgId: null,
        reason: 'pickup window closed',
        metadata: { listingId: 'l1' },
      }),
    );
  });

  it('writes on the executor it is given (a transaction)', async () => {
    const { db, insert } = makeDb();
    const repository = new AuditRepository(db);
    const txValues = jest.fn().mockResolvedValue(undefined);
    const txInsert = jest.fn(() => ({ values: txValues }));
    const tx = { insert: txInsert } as unknown as Database;

    await repository.record(
      {
        actor: { userId: 'u1', orgId: 'o1' },
        action: 'claim.created',
        entityType: 'claim',
        entityId: 'c1',
      },
      tx,
    );

    expect(txInsert).toHaveBeenCalledWith(auditLog);
    expect(insert).not.toHaveBeenCalled();
  });
});

type Chain = Record<string, jest.Mock>;

function makeQueryDb(items: unknown[], total: number) {
  const seen: {
    where?: unknown;
    orderBy?: unknown[];
    limit?: number;
    offset?: number;
    options?: unknown;
  } = {};
  let selects = 0;

  const tx = {
    select: jest.fn(() => {
      selects += 1;
      const isCount = selects === 2;
      const chain: Chain = {
        from: jest.fn(() => chain),
        where: jest.fn((clause: unknown) => {
          seen.where ??= clause;
          return isCount ? Promise.resolve([{ value: total }]) : chain;
        }),
        orderBy: jest.fn((...args: unknown[]) => {
          seen.orderBy = args;
          return chain;
        }),
        limit: jest.fn((n: number) => {
          seen.limit = n;
          return chain;
        }),
        offset: jest.fn((n: number) => {
          seen.offset = n;
          return Promise.resolve(items);
        }),
      };
      return chain;
    }),
  };

  const db = {
    transaction: jest.fn(
      async (fn: (tx: unknown) => Promise<unknown>, options: unknown) => {
        seen.options = options;
        return fn(tx);
      },
    ),
  } as unknown as Database;

  return { db, seen };
}

describe('AuditRepository.findByEntity', () => {
  it('returns the page and the unpaged total', async () => {
    const rows = [{ id: 'a1' }, { id: 'a2' }];
    const { db } = makeQueryDb(rows, 7);
    const repository = new AuditRepository(db);

    const result = await repository.findByEntity('listing', 'l1', {
      limit: 2,
      offset: 0,
    });

    expect(result).toEqual({ items: rows, total: 7 });
  });

  it('orders by created_at then id, so paging is stable on ties', async () => {
    const { db, seen } = makeQueryDb([], 0);
    const repository = new AuditRepository(db);

    await repository.findByEntity('listing', 'l1', { limit: 50, offset: 0 });

    expect(seen.orderBy).toEqual([asc(auditLog.createdAt), asc(auditLog.id)]);
  });

  it('applies the requested page window', async () => {
    const { db, seen } = makeQueryDb([], 0);
    const repository = new AuditRepository(db);

    await repository.findByEntity('claim', 'c1', { limit: 10, offset: 20 });

    expect(seen.limit).toBe(10);
    expect(seen.offset).toBe(20);
  });

  it('reads the page and the total from one read-only snapshot', async () => {
    const { db, seen } = makeQueryDb([], 0);
    const repository = new AuditRepository(db);

    await repository.findByEntity('claim', 'c1', { limit: 50, offset: 0 });

    expect(seen.options).toEqual({
      isolationLevel: 'repeatable read',
      accessMode: 'read only',
    });
  });

  it('scopes to the entity alone when no filter is given', async () => {
    const { db, seen } = makeQueryDb([], 0);
    const repository = new AuditRepository(db);

    await repository.findByEntity('listing', 'l1', { limit: 50, offset: 0 });

    expect(seen.where).toEqual(
      and(eq(auditLog.entityType, 'listing'), eq(auditLog.entityId, 'l1')),
    );
  });

  it('adds the actor filter when one is given', async () => {
    const { db, seen } = makeQueryDb([], 0);
    const repository = new AuditRepository(db);

    await repository.findByEntity('listing', 'l1', {
      userId: 'u1',
      limit: 50,
      offset: 0,
    });

    expect(seen.where).toEqual(
      and(
        eq(auditLog.entityType, 'listing'),
        eq(auditLog.entityId, 'l1'),
        eq(auditLog.userId, 'u1'),
      ),
    );
  });

  it('bounds the timestamp range inclusively on both ends', async () => {
    const { db, seen } = makeQueryDb([], 0);
    const repository = new AuditRepository(db);

    await repository.findByEntity('listing', 'l1', {
      createdAtFrom: '2026-01-01T00:00:00.000Z',
      createdAtTo: '2026-01-31T00:00:00.000Z',
      limit: 50,
      offset: 0,
    });

    expect(seen.where).toEqual(
      and(
        eq(auditLog.entityType, 'listing'),
        eq(auditLog.entityId, 'l1'),
        gte(auditLog.createdAt, new Date('2026-01-01T00:00:00.000Z')),
        lte(auditLog.createdAt, new Date('2026-01-31T00:00:00.000Z')),
      ),
    );
  });

  it('orders the entity history oldest first', async () => {
    const { db, seen } = makeQueryDb([], 0);
    const repository = new AuditRepository(db);

    await repository.findByEntity('listing', 'l1', { limit: 50, offset: 0 });

    expect(seen.orderBy).toEqual([asc(auditLog.createdAt), asc(auditLog.id)]);
  });
});

describe('AuditRepository.findMany', () => {
  it('orders the feed newest first', async () => {
    const { db, seen } = makeQueryDb([], 0);
    const repository = new AuditRepository(db);

    await repository.findMany({ limit: 50, offset: 0 });

    expect(seen.orderBy).toEqual([desc(auditLog.createdAt), desc(auditLog.id)]);
  });

  it('applies no where clause when called with no filters', async () => {
    const { db, seen } = makeQueryDb([], 0);
    const repository = new AuditRepository(db);

    await repository.findMany({ limit: 50, offset: 0 });

    expect(seen.where).toBeUndefined();
  });

  it('narrows to one entity type', async () => {
    const { db, seen } = makeQueryDb([], 0);
    const repository = new AuditRepository(db);

    await repository.findMany({ entityType: 'claim', limit: 50, offset: 0 });

    expect(seen.where).toEqual(and(eq(auditLog.entityType, 'claim')));
  });

  it('combines the entity type, actor and range filters', async () => {
    const { db, seen } = makeQueryDb([], 0);
    const repository = new AuditRepository(db);

    await repository.findMany({
      entityType: 'listing',
      userId: 'u1',
      createdAtFrom: '2026-01-01T00:00:00.000Z',
      createdAtTo: '2026-01-31T00:00:00.000Z',
      limit: 50,
      offset: 0,
    });

    expect(seen.where).toEqual(
      and(
        eq(auditLog.entityType, 'listing'),
        eq(auditLog.userId, 'u1'),
        gte(auditLog.createdAt, new Date('2026-01-01T00:00:00.000Z')),
        lte(auditLog.createdAt, new Date('2026-01-31T00:00:00.000Z')),
      ),
    );
  });

  it('returns the page and the filtered total', async () => {
    const rows = [{ id: 'a1' }];
    const { db } = makeQueryDb(rows, 9);
    const repository = new AuditRepository(db);

    const result = await repository.findMany({ limit: 1, offset: 0 });

    expect(result).toEqual({ items: rows, total: 9 });
  });
});
