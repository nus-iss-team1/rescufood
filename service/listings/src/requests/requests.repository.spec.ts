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
// AST's queryChunks by hand sidesteps that.
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
    'leftJoin',
    'innerJoin',
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
  status: 'active' as const,
  requestedQuantity: '10.00',
  requestedAt: new Date('2026-08-06T00:00:00Z'),
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
  pickupOpenReminderSentAt: null,
  pickupCloseReminderSentAt: null,
  createdAt: new Date('2026-08-06T00:00:00Z'),
  updatedAt: new Date('2026-08-06T00:00:00Z'),
};

const baseListing = {
  id: 'listing-1',
  donorOrgId: 'org-donor',
  status: 'available' as const,
  quantity: '10.00',
  unit: 'kg',
  pickupWindowEnd: new Date('2026-08-10T00:00:00Z'),
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
        status: 'active',
        requestedQuantity: '10.00',
      });

      expect(result).toEqual(baseRequest);
      expect(db.insert).toHaveBeenCalledWith(requests);
    });

    it('runs against the given executor when one is passed', async () => {
      const db = makeDb();
      const tx = { insert: jest.fn().mockReturnValue(chain([baseRequest])) };
      const repository = new RequestsRepository(db as unknown as Database);

      await repository.create(
        {
          listingId: 'listing-1',
          rescueOrgId: 'org-rescue',
          claimedBy: 'user-rescue',
          idempotencyKey: 'idem-1',
          status: 'active',
          requestedQuantity: '10.00',
        },
        tx as unknown as Database,
      );

      expect(tx.insert).toHaveBeenCalledWith(requests);
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('findByIdempotencyKey', () => {
    it('scopes the lookup to the claiming org', async () => {
      const db = makeDb();
      const queryChain = chain([baseRequest]);
      db.select.mockReturnValue(queryChain);
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.findByIdempotencyKey('org-rescue', 'idem-1'),
      ).resolves.toEqual(baseRequest);

      const { params } = renderWhere(queryChain.where as jest.Mock);
      expect(params).toEqual(expect.arrayContaining(['org-rescue', 'idem-1']));
    });

    it('returns undefined when missing', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.findByIdempotencyKey('org-rescue', 'missing'),
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

  describe('findClaimantContext', () => {
    it('returns the user status and the org type and status', async () => {
      const db = makeDb();
      db.select.mockReturnValue(
        chain([
          {
            userStatus: 'active',
            orgType: 'rescue_partner',
            orgStatus: 'approved',
          },
        ]),
      );
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.findClaimantContext('user-rescue'),
      ).resolves.toEqual({
        userStatus: 'active',
        orgType: 'rescue_partner',
        orgStatus: 'approved',
      });
    });

    it('returns undefined when the user row is missing', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.findClaimantContext('missing'),
      ).resolves.toBeUndefined();
    });

    it('coerces a missing org type/status to empty strings', async () => {
      const db = makeDb();
      db.select.mockReturnValue(
        chain([{ userStatus: 'active', orgType: null, orgStatus: null }]),
      );
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.findClaimantContext('user-rescue'),
      ).resolves.toEqual({ userStatus: 'active', orgType: '', orgStatus: '' });
    });
  });

  describe('reserveListingForClaim', () => {
    it('flips an available listing to reserved and bumps version', async () => {
      const db = makeDb();
      const updateChain = chain([{ ...baseListing, status: 'reserved' }]);
      db.update.mockReturnValue(updateChain);
      const repository = new RequestsRepository(db as unknown as Database);

      const result = await repository.reserveListingForClaim('listing-1');

      expect(db.update).toHaveBeenCalledWith(listings);
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'reserved' }),
      );
      const { sql, params } = renderWhere(updateChain.where as jest.Mock);
      expect(sql).toContain('"status" =');
      expect(sql).toContain('deleted_at');
      expect(params).toContain('available');
      expect(result?.status).toBe('reserved');
    });

    it('returns undefined when the listing is no longer available', async () => {
      const db = makeDb();
      db.update.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.reserveListingForClaim('listing-1'),
      ).resolves.toBeUndefined();
    });

    it('runs against the given executor', async () => {
      const db = makeDb();
      const tx = {
        update: jest
          .fn()
          .mockReturnValue(chain([{ ...baseListing, status: 'reserved' }])),
      };
      const repository = new RequestsRepository(db as unknown as Database);

      await repository.reserveListingForClaim(
        'listing-1',
        tx as unknown as Database,
      );

      expect(tx.update).toHaveBeenCalledWith(listings);
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('returns the updated row when the expected status matches', async () => {
      const db = makeDb();
      db.update.mockReturnValue(
        chain([{ ...baseRequest, status: 'cancelled' }]),
      );
      const repository = new RequestsRepository(db as unknown as Database);

      const result = await repository.updateStatus('request-1', 'active', {
        status: 'cancelled',
      });

      expect(db.update).toHaveBeenCalledWith(requests);
      expect(result?.status).toBe('cancelled');
    });

    it('returns undefined when no row matches id + expected status', async () => {
      const db = makeDb();
      db.update.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.updateStatus('request-1', 'active', {
          status: 'cancelled',
        }),
      ).resolves.toBeUndefined();
    });

    it('runs against the given executor (e.g. a transaction) instead of the plain db', async () => {
      const db = makeDb();
      const tx = { update: jest.fn().mockReturnValue(chain([baseRequest])) };
      const repository = new RequestsRepository(db as unknown as Database);

      await repository.updateStatus(
        'request-1',
        'active',
        { status: 'cancelled' },
        tx as unknown as Database,
      );

      expect(tx.update).toHaveBeenCalledWith(requests);
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('incrementPickupCodeAttempts', () => {
    it('atomically bumps the counter for a claim still accepted and returns the new count', async () => {
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
      expect(params).toContain('active');
      expect(result).toBe(3);
    });

    it('returns undefined when the claim is no longer accepted', async () => {
      const db = makeDb();
      db.update.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.incrementPickupCodeAttempts('request-1', new Date()),
      ).resolves.toBeUndefined();
    });
  });

  describe('markListingCollectedIfDone', () => {
    it('flips a reserved listing to collected when no accepted claims remain', async () => {
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

    it('returns false when the listing is not reserved, or an accepted claim remains', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([]));
      db.update.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(
        repository.markListingCollectedIfDone('listing-1'),
      ).resolves.toBe(false);
    });
  });

  describe('reopenListingAfterClaimEnded', () => {
    it('reopens a reserved listing to available and bumps version', async () => {
      const db = makeDb();
      const updateChain = chain([baseListing]);
      db.update.mockReturnValue(updateChain);
      const repository = new RequestsRepository(db as unknown as Database);

      await repository.reopenListingAfterClaimEnded('listing-1');

      expect(db.update).toHaveBeenCalledWith(listings);
      const { sql } = renderWhere(updateChain.where as jest.Mock);
      expect(sql).not.toContain('"status" =');
      expect(sql).toContain('deleted_at');
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          version: expect.anything() as unknown,
        }),
      );
    });

    it('runs against the given executor', async () => {
      const db = makeDb();
      const tx = { update: jest.fn().mockReturnValue(chain([baseListing])) };
      const repository = new RequestsRepository(db as unknown as Database);

      await repository.reopenListingAfterClaimEnded(
        'listing-1',
        tx as unknown as Database,
      );

      expect(tx.update).toHaveBeenCalledWith(listings);
      expect(db.update).not.toHaveBeenCalled();
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

    it('scopes a non-admin viewer to claims they filed or listings they donated', async () => {
      const db = makeDb();
      const subChain = chain([]);
      const mainChain = chain([baseRequest]);
      db.select.mockReturnValueOnce(subChain).mockReturnValueOnce(mainChain);
      const repository = new RequestsRepository(db as unknown as Database);

      await repository.findMany({ limit: 20, offset: 0 }, rescueViewer);

      const { sql: subSql, params: subParams } = renderWhere(
        subChain.where as jest.Mock,
      );
      expect(subSql).toContain('donor_org_id');
      expect(subParams).toContain('org-rescue');

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
        { status: 'active', limit: 20, offset: 0 },
        adminViewer,
      );

      const { sql, params } = renderWhere(queryChain.where as jest.Mock);
      expect(sql).not.toContain('rescue_org_id');
      expect(params).toEqual(['active']);
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

  describe('markDuePickupReminders', () => {
    const now = new Date('2026-08-10T12:00:00Z');
    const lead = 24 * 60 * 60 * 1000;

    it('opening: guards on active + unsent + window opening within the lead', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([]));
      const updateChain = chain([{ id: 'r1', listingId: 'l1' }]);
      db.update.mockReturnValue(updateChain);
      const repository = new RequestsRepository(db as unknown as Database);

      const result = await repository.markDuePickupReminders(
        'opening',
        now,
        lead,
      );

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ pickupOpenReminderSentAt: now }),
      );
      const inner = renderWhere(
        (db.select.mock.results[0].value as { where: jest.Mock }).where,
      );
      expect(inner.params).toEqual(
        expect.arrayContaining(['active', now.toISOString()]),
      );
      // window opens after now, and no later than now + lead
      expect(inner.sql).toContain('"pickup_window_start" >');
      expect(inner.sql).toContain('"pickup_window_start" <=');
      expect(result).toEqual([{ id: 'r1', listingId: 'l1' }]);
    });

    it('closing: window already open and ending within the lead', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([]));
      db.update.mockReturnValue(chain([]));
      const repository = new RequestsRepository(db as unknown as Database);

      await repository.markDuePickupReminders('closing', now, lead);

      const inner = renderWhere(
        (db.select.mock.results[0].value as { where: jest.Mock }).where,
      );
      expect(inner.sql).toContain('"pickup_window_start" <=');
      expect(inner.sql).toContain('"pickup_window_end" >');
      expect(inner.sql).toContain('"pickup_window_end" <=');
    });
  });

  describe('findPickupReminderTargets', () => {
    it('returns [] for no ids without querying', async () => {
      const db = makeDb();
      const repository = new RequestsRepository(db as unknown as Database);

      await expect(repository.findPickupReminderTargets([])).resolves.toEqual(
        [],
      );
      expect(db.select).not.toHaveBeenCalled();
    });

    it('joins the listing and both orgs', async () => {
      const db = makeDb();
      const queryChain = chain([
        {
          listingDescription: 'Bread',
          pickupLocation: 'Loc',
          pickupWindowStart: new Date('2026-08-11T00:00:00Z'),
          pickupWindowEnd: new Date('2026-08-11T04:00:00Z'),
          rescueEmail: 'r@x.com',
          donorEmail: 'd@x.com',
        },
      ]);
      db.select.mockReturnValue(queryChain);
      const repository = new RequestsRepository(db as unknown as Database);

      const rows = await repository.findPickupReminderTargets(['r1']);

      expect(queryChain.innerJoin).toHaveBeenCalledTimes(3);
      expect(rows[0]).toMatchObject({
        rescueEmail: 'r@x.com',
        donorEmail: 'd@x.com',
      });
    });
  });
});
