import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { AuthenticatedUser } from '../common/types/express';
import type { Database } from '../db/db.module';
import { listings, requests } from '../db/schema';
import { RequestsRepository } from './requests.repository';

const adminViewer: AuthenticatedUser = {
  userId: 'admin-1',
  role: 'admin',
  orgId: 'org-admin',
};
const rescueViewer: AuthenticatedUser = {
  userId: 'user-rescue',
  role: 'user',
  orgId: 'org-rescue',
};
const orglessViewer: AuthenticatedUser = {
  userId: 'user-no-org',
  role: 'user',
};

const dialect = new PgDialect();
function renderWhere(whereMock: jest.Mock) {
  const [condition] = whereMock.mock.calls[0] as [SQL];
  return dialect.sqlToQuery(condition);
}

function sortedColumnAndDirection(orderArg: SQL) {
  const [, column, direction] = orderArg.queryChunks as [
    unknown,
    unknown,
    { value: string[] },
  ];
  return { column, direction: direction.value[0] };
}

// The org-scoping condition embeds a real subquery built from a *mocked*
// `db.select(...)` chain (see `chain()` below), which isn't a real drizzle
// query - dialect.sqlToQuery throws trying to serialize it. Walking the SQL
// AST's queryChunks by hand sidesteps that: it only needs to find a Column
// with the given name, never render anything to text.
function containsColumn(node: unknown, columnName: string, depth = 0): boolean {
  if (depth > 20 || !node || typeof node !== 'object') return false;
  const n = node as { name?: string; queryChunks?: unknown[] };
  if (n.name === columnName) return true;
  if (Array.isArray(n.queryChunks)) {
    return n.queryChunks.some((c) => containsColumn(c, columnName, depth + 1));
  }
  return false;
}

function chain(result: unknown) {
  const self: Record<string, unknown> = {
    then: (resolve: (v: unknown) => void) => resolve(result),
  };
  for (const method of [
    'values',
    'returning',
    'from',
    'where',
    'orderBy',
    'limit',
    'offset',
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
  };
}

const baseRequest = {
  id: 'request-1',
  listingId: 'listing-1',
  rescueOrgId: 'org-rescue',
  claimedBy: 'user-rescue',
  idempotencyKey: 'idem-1',
  status: 'pending' as const,
  requestedQuantity: '5.00',
  requestedAt: new Date('2026-08-06T00:00:00Z'),
  respondedBy: null,
  respondedAt: null,
  declineReason: '',
  cancelledAt: null,
  cancellationReason: '',
  pickupCodeHash: null,
  codeExpiresAt: null,
  codeGeneratedBy: null,
  pickupCodeAttempts: 0,
  verifiedBy: null,
  collectedQuantity: null,
  collectedAt: null,
  noShowReason: '',
  createdAt: new Date('2026-08-06T00:00:00Z'),
  updatedAt: new Date('2026-08-06T00:00:00Z'),
};

const baseListing = {
  id: 'listing-1',
  donorOrgId: 'org-donor',
  status: 'available' as const,
  remainingQuantity: '10.00',
  unit: 'kg',
};

describe('RequestsRepository', () => {
  describe('create', () => {
    it('inserts and returns the created row', async () => {
      const db = makeDb();
      db.insert.mockReturnValue(chain([baseRequest]));
      const repository = new RequestsRepository(db as unknown as Database);

      const result = await repository.create({
        listingId: 'listing-1',
        rescueOrgId: 'org-rescue',
        claimedBy: 'user-rescue',
        idempotencyKey: 'idem-1',
        requestedQuantity: '5.00',
      });

      expect(result).toEqual(baseRequest);
      expect(db.insert).toHaveBeenCalledWith(requests);
    });
  });

  describe('findByIdempotencyKey', () => {
    it('returns the row when found', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseRequest]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(repository.findByIdempotencyKey('idem-1')).resolves.toEqual(
        baseRequest,
      );
    });

    it('returns undefined when missing', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.findByIdempotencyKey('missing'),
      ).resolves.toBeUndefined();
    });
  });

  describe('findById', () => {
    it('returns the row when found', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseRequest]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(repository.findById('request-1')).resolves.toEqual(
        baseRequest,
      );
    });

    it('returns undefined when missing', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(repository.findById('missing')).resolves.toBeUndefined();
    });
  });

  describe('findListingById', () => {
    it('returns the narrow listing projection when found', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseListing]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(repository.findListingById('listing-1')).resolves.toEqual(
        baseListing,
      );
    });

    it('returns undefined when missing', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.findListingById('missing'),
      ).resolves.toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('returns the updated row when the expected status matches', async () => {
      const db = makeDb();
      db.update.mockReturnValue(
        chain([{ ...baseRequest, status: 'accepted' }]),
      );
      const repository = new RequestsRepository(db as unknown as Database);

      const result = await repository.updateStatus('request-1', 'pending', {
        status: 'accepted',
      });

      expect(db.update).toHaveBeenCalledWith(requests);
      expect(result?.status).toBe('accepted');
    });

    it('returns undefined when no row matches id + expected status', async () => {
      const db = makeDb();
      db.update.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.updateStatus('request-1', 'pending', {
          status: 'accepted',
        }),
      ).resolves.toBeUndefined();
    });

    it('runs against the given executor (e.g. a transaction) instead of the plain db', async () => {
      const db = makeDb();
      const tx = { update: jest.fn().mockReturnValue(chain([baseRequest])) };
      const repository = new RequestsRepository(db as unknown as Database);

      await repository.updateStatus(
        'request-1',
        'pending',
        { status: 'accepted' },
        tx as unknown as Database,
      );

      expect(tx.update).toHaveBeenCalledWith(requests);
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('incrementPickupCodeAttempts', () => {
    it('atomically bumps the counter for a request still accepted and returns the new count', async () => {
      const db = makeDb();
      const updateChain = chain([{ pickupCodeAttempts: 3 }]);
      db.update.mockReturnValue(updateChain);
      const repository = new RequestsRepository(db as unknown as Database);
      const now = new Date('2026-08-06T01:00:00Z');

      const result = await repository.incrementPickupCodeAttempts(
        'request-1',
        now,
      );

      expect(db.update).toHaveBeenCalledWith(requests);
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ updatedAt: now }),
      );
      const { sql, params } = renderWhere(updateChain.where as jest.Mock);
      expect(sql).toContain('"status" =');
      expect(params).toContain('accepted');
      expect(result).toBe(3);
    });

    it('returns undefined when the request is no longer accepted', async () => {
      const db = makeDb();
      db.update.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.incrementPickupCodeAttempts('request-1', new Date()),
      ).resolves.toBeUndefined();
    });
  });

  describe('supersedeOtherPending', () => {
    it('supersedes other pending requests on the listing, excluding the given one', async () => {
      const db = makeDb();
      const updateChain = chain([{ id: 'request-2' }, { id: 'request-3' }]);
      db.update.mockReturnValue(updateChain);
      const repository = new RequestsRepository(db as unknown as Database);

      const result = await repository.supersedeOtherPending(
        'listing-1',
        'request-1',
      );

      expect(db.update).toHaveBeenCalledWith(requests);
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'superseded' }),
      );
      const { sql, params } = renderWhere(updateChain.where as jest.Mock);
      expect(sql).toContain('"status" =');
      expect(sql).toContain('<>'); // excludes the given request id
      expect(params).toEqual(
        expect.arrayContaining(['listing-1', 'pending', 'request-1']),
      );
      expect(result).toBe(2);
    });

    it('returns 0 when nothing else was pending', async () => {
      const db = makeDb();
      db.update.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.supersedeOtherPending('listing-1', 'request-1'),
      ).resolves.toBe(0);
    });
  });

  describe('markListingCollectedIfDone', () => {
    it('flips a reserved listing to collected when no accepted requests remain', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([]));
      const updateChain = chain([{ id: 'listing-1' }]);
      db.update.mockReturnValue(updateChain);
      const repository = new RequestsRepository(db as unknown as Database);

      const result = await repository.markListingCollectedIfDone('listing-1');

      expect(db.update).toHaveBeenCalledWith(listings);
      const { sql, params } = renderWhere(updateChain.where as jest.Mock);
      expect(sql).toContain('"status" =');
      expect(sql).toContain('not exists');
      expect(params).toContain('reserved');
      expect(result).toBe(true);
    });

    it('returns false when the listing is not reserved, or an accepted request remains', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([]));
      db.update.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.markListingCollectedIfDone('listing-1'),
      ).resolves.toBe(false);
    });
  });

  describe('decrementListingQuantity', () => {
    it('updates the listings table, scoped to available and not soft-deleted', async () => {
      const db = makeDb();
      const updateChain = chain([
        { ...baseListing, remainingQuantity: '5.00' },
      ]);
      db.update.mockReturnValue(updateChain);
      const repository = new RequestsRepository(db as unknown as Database);

      const result = await repository.decrementListingQuantity(
        'listing-1',
        '5.00',
      );

      expect(db.update).toHaveBeenCalledWith(listings);
      const { sql, params } = renderWhere(updateChain.where as jest.Mock);
      expect(sql).toContain('"status" =');
      expect(sql).toContain('deleted_at');
      expect(params).toContain('available');
      expect(result?.remainingQuantity).toBe('5.00');
    });

    it('returns undefined when no row matches (listing not available/missing)', async () => {
      const db = makeDb();
      db.update.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.decrementListingQuantity('listing-1', '5.00'),
      ).resolves.toBeUndefined();
    });
  });

  describe('incrementListingQuantity', () => {
    it('updates the listings table without requiring a particular current status', async () => {
      const db = makeDb();
      const updateChain = chain([baseListing]);
      db.update.mockReturnValue(updateChain);
      const repository = new RequestsRepository(db as unknown as Database);

      await repository.incrementListingQuantity('listing-1', '5.00');

      expect(db.update).toHaveBeenCalledWith(listings);
      const { sql } = renderWhere(updateChain.where as jest.Mock);
      expect(sql).not.toContain('"status" =');
      expect(sql).toContain('deleted_at');
    });
  });

  describe('findMany', () => {
    it('defaults to sorting by requestedAt descending', async () => {
      const db = makeDb();
      const queryChain = chain([baseRequest]);
      db.select.mockReturnValue(queryChain);
      const repository = new RequestsRepository(db as unknown as Database);

      await repository.findMany({ limit: 20, offset: 0 }, adminViewer);

      const [orderArg] = (queryChain.orderBy as jest.Mock).mock
        .calls[0] as SQL[];
      const { column, direction } = sortedColumnAndDirection(orderArg);
      expect(column).toBe(requests.requestedAt);
      expect(direction).toContain('desc');
    });

    it('scopes a non-admin viewer to requests they filed or listings they donated', async () => {
      const db = makeDb();
      // Two distinct chains: buildConditions issues one `select` for the
      // donor-org subquery before findMany issues its own for the main
      // query - see the equivalent donorOrgName test in
      // listings.repository.spec.ts.
      const subChain = chain([]);
      const mainChain = chain([baseRequest]);
      db.select.mockReturnValueOnce(subChain).mockReturnValueOnce(mainChain);
      const repository = new RequestsRepository(db as unknown as Database);

      await repository.findMany({ limit: 20, offset: 0 }, rescueViewer);

      // The subquery filters listings by the viewer's org as donor.
      const { sql: subSql, params: subParams } = renderWhere(
        subChain.where as jest.Mock,
      );
      expect(subSql).toContain('donor_org_id');
      expect(subParams).toContain('org-rescue');

      // The main query ORs a direct rescueOrgId match with membership in
      // that subquery's listing ids.
      const [mainCondition] = (mainChain.where as jest.Mock).mock.calls[0] as [
        unknown,
      ];
      expect(containsColumn(mainCondition, 'rescue_org_id')).toBe(true);
      expect(containsColumn(mainCondition, 'listing_id')).toBe(true);
    });

    it('scopes an org-less non-admin viewer to nothing', async () => {
      const db = makeDb();
      const queryChain = chain([]);
      db.select.mockReturnValue(queryChain);
      const repository = new RequestsRepository(db as unknown as Database);

      await repository.findMany({ limit: 20, offset: 0 }, orglessViewer);

      const { sql } = renderWhere(queryChain.where as jest.Mock);
      expect(sql).toContain('false');
    });

    it('does not scope an admin viewer', async () => {
      const db = makeDb();
      const queryChain = chain([baseRequest]);
      db.select.mockReturnValue(queryChain);
      const repository = new RequestsRepository(db as unknown as Database);

      await repository.findMany(
        { status: 'pending', limit: 20, offset: 0 },
        adminViewer,
      );

      const { sql, params } = renderWhere(queryChain.where as jest.Mock);
      expect(sql).not.toContain('rescue_org_id');
      expect(params).toEqual(['pending']);
    });
  });

  describe('countMany', () => {
    it('returns the row count for the same filters findMany would use', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([{ value: 4 }]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.countMany({ limit: 20, offset: 0 }, adminViewer),
      ).resolves.toBe(4);
    });
  });
});
