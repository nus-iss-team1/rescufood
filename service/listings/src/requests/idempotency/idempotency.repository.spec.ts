import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { Database } from '../../db/db.module';
import { IdempotencyRepository } from './idempotency.repository';

const dialect = new PgDialect();

function chain(result: unknown) {
  const self: Record<string, unknown> = {
    then: (resolve: (v: unknown) => void) => resolve(result),
  };
  for (const method of [
    'values',
    'onConflictDoNothing',
    'returning',
    'from',
    'where',
    'set',
  ]) {
    self[method] = jest.fn(() => self);
  }
  return self;
}

function makeDb() {
  return {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

const record = {
  id: 'slot-1',
  rescueOrgId: 'org-rescue',
  idempotencyKey: 'idem-1',
  requestFingerprint: 'fp',
  status: 'pending',
  claimId: null,
  responseSnapshot: null,
};

describe('IdempotencyRepository', () => {
  describe('claimSlot', () => {
    it('inserts a pending slot and returns it', async () => {
      const db = makeDb();
      const c = chain([record]);
      db.insert.mockReturnValue(c);
      const repo = new IdempotencyRepository(db as unknown as Database);

      const values = {
        rescueOrgId: 'org-rescue',
        idempotencyKey: 'idem-1',
        requestFingerprint: 'fp',
        expiresAt: new Date(),
      };
      await expect(repo.claimSlot(values)).resolves.toEqual(record);
      expect(c.values).toHaveBeenCalledWith(values);
      expect(c.onConflictDoNothing).toHaveBeenCalled();
    });

    it('returns undefined when the slot already exists', async () => {
      const db = makeDb();
      db.insert.mockReturnValue(chain([]));
      const repo = new IdempotencyRepository(db as unknown as Database);

      await expect(
        repo.claimSlot({
          rescueOrgId: 'o',
          idempotencyKey: 'k',
          requestFingerprint: 'fp',
          expiresAt: new Date(),
        }),
      ).resolves.toBeUndefined();
    });

    it('runs against the given executor', async () => {
      const db = makeDb();
      const tx = { insert: jest.fn().mockReturnValue(chain([record])) };
      const repo = new IdempotencyRepository(db as unknown as Database);

      await repo.claimSlot(
        {
          rescueOrgId: 'o',
          idempotencyKey: 'k',
          requestFingerprint: 'fp',
          expiresAt: new Date(),
        },
        tx as never,
      );

      expect(tx.insert).toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('find', () => {
    it('scopes the lookup to the org and key', async () => {
      const db = makeDb();
      const c = chain([record]);
      db.select.mockReturnValue(c);
      const repo = new IdempotencyRepository(db as unknown as Database);

      await expect(repo.find('org-rescue', 'idem-1')).resolves.toEqual(record);

      const [condition] = (c.where as jest.Mock).mock.calls[0] as [SQL];
      const { params } = dialect.sqlToQuery(condition);
      expect(params).toEqual(expect.arrayContaining(['org-rescue', 'idem-1']));
    });
  });

  describe('complete', () => {
    it('flips the slot to completed with the outcome and new expiry', async () => {
      const db = makeDb();
      const c = chain([]);
      db.update.mockReturnValue(c);
      const repo = new IdempotencyRepository(db as unknown as Database);
      const expiresAt = new Date();

      await repo.complete(
        'slot-1',
        'request-1',
        { id: 'request-1' },
        expiresAt,
      );

      expect(c.set).toHaveBeenCalledWith({
        status: 'completed',
        claimId: 'request-1',
        responseSnapshot: { id: 'request-1' },
        expiresAt,
      });
    });
  });

  describe('deleteExpired', () => {
    it('deletes rows past expiry and returns the count', async () => {
      const db = makeDb();
      db.delete.mockReturnValue(chain([{ id: 'a' }, { id: 'b' }]));
      const repo = new IdempotencyRepository(db as unknown as Database);

      await expect(repo.deleteExpired(new Date())).resolves.toBe(2);
    });
  });
});
