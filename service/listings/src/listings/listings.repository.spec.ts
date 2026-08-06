import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { AuthenticatedUser } from '../common/types/express';
import type { Database } from '../db/db.module';
import { listings } from '../db/schema';
import { ListingsRepository } from './listings.repository';

// Admin bypasses the draft-visibility filter entirely, so most findMany
// tests below use this viewer to keep their assertions focused on the
// behaviour under test - the visibility filter itself is covered separately.
const adminViewer: AuthenticatedUser = {
  userId: 'admin-1',
  role: 'admin',
  orgId: 'org-1',
};

// asc()/desc() build a SQL fragment as [prefix, column, ' asc' | ' desc'];
// this reaches into that shape to assert which column and direction the
// repository asked the query builder to sort by.
function sortedColumnAndDirection(orderArg: SQL) {
  const [, column, direction] = orderArg.queryChunks as [
    unknown,
    unknown,
    { value: string[] },
  ];
  return { column, direction: direction.value[0] };
}

// The `where(...)` argument is a real drizzle-orm SQL AST (only `db.select`
// itself is mocked) - rendering it through the pg dialect turns it back into
// readable SQL text + params so tests can assert on filter behaviour without
// a live database.
const dialect = new PgDialect();
function renderWhere(whereMock: jest.Mock) {
  const [condition] = whereMock.mock.calls[0] as [SQL];
  return dialect.sqlToQuery(condition);
}

// Drizzle's query builder is a chainable thenable: every call
// (.select().from().where()...) returns the same object, and awaiting it
// resolves to the configured result. This mimics just enough of that shape
// to drive the repository without a real Postgres connection.
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
    delete: jest.fn(),
  };
}

const baseListing = {
  id: 'listing-1',
  donorOrgId: 'org-1',
  createdBy: 'user-1',
  category: 'produce' as const,
  description: 'Fresh vegetables',
  remainingQuantity: '10.00',
  unit: 'kg',
  allergens: [],
  handlingInstructions: '',
  useBy: new Date('2026-08-10T00:00:00Z'),
  pickupLocation: '123 Main St',
  pickupWindowStart: new Date('2026-08-09T09:00:00Z'),
  pickupWindowEnd: new Date('2026-08-09T17:00:00Z'),
  status: 'draft' as const,
  version: 1,
  cancelledReason: '',
  createdAt: new Date('2026-08-06T00:00:00Z'),
  updatedAt: new Date('2026-08-06T00:00:00Z'),
};

describe('ListingsRepository', () => {
  describe('create', () => {
    it('inserts and returns the created row', async () => {
      const db = makeDb();
      db.insert.mockReturnValue(chain([baseListing]));
      const repository = new ListingsRepository(db as unknown as Database);

      const result = await repository.create({
        donorOrgId: 'org-1',
        createdBy: 'user-1',
        category: 'produce',
        description: 'Fresh vegetables',
        remainingQuantity: '10.00',
        unit: 'kg',
        useBy: new Date('2026-08-10T00:00:00Z'),
        pickupLocation: '123 Main St',
        pickupWindowStart: new Date('2026-08-09T09:00:00Z'),
        pickupWindowEnd: new Date('2026-08-09T17:00:00Z'),
      });

      expect(result).toEqual(baseListing);
      expect(db.insert).toHaveBeenCalledWith(listings);
    });
  });

  describe('findById', () => {
    it('returns the row when found', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseListing]));
      const repository = new ListingsRepository(db as unknown as Database);

      await expect(repository.findById('listing-1')).resolves.toEqual(
        baseListing,
      );
    });

    it('returns undefined when missing', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([]));
      const repository = new ListingsRepository(db as unknown as Database);

      await expect(repository.findById('missing')).resolves.toBeUndefined();
    });
  });

  describe('updateWithVersion', () => {
    it('returns the updated row when the version matches', async () => {
      const db = makeDb();
      db.update.mockReturnValue(chain([{ ...baseListing, version: 2 }]));
      const repository = new ListingsRepository(db as unknown as Database);

      const result = await repository.updateWithVersion('listing-1', 1, {
        version: 2,
      });

      expect(result?.version).toBe(2);
    });

    it('returns undefined when no row matches id + version', async () => {
      const db = makeDb();
      db.update.mockReturnValue(chain([]));
      const repository = new ListingsRepository(db as unknown as Database);

      await expect(
        repository.updateWithVersion('listing-1', 1, { version: 2 }),
      ).resolves.toBeUndefined();
    });
  });

  describe('delete', () => {
    it('soft-deletes by id, setting deletedAt and the given version', async () => {
      const db = makeDb();
      const updateChain = chain([{ ...baseListing, version: 2 }]);
      db.update.mockReturnValue(updateChain);
      const repository = new ListingsRepository(db as unknown as Database);

      const result = await repository.delete('listing-1', 2);

      expect(db.update).toHaveBeenCalledWith(listings);
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date), version: 2 }),
      );
      expect(updateChain.where).toHaveBeenCalled();
      expect(result?.version).toBe(2);
    });

    it('returns undefined when the row is already deleted', async () => {
      const db = makeDb();
      db.update.mockReturnValue(chain([]));
      const repository = new ListingsRepository(db as unknown as Database);

      await expect(repository.delete('listing-1', 2)).resolves.toBeUndefined();
    });
  });

  describe('countAssociatedRequests', () => {
    it('returns the request count for the listing', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([{ value: 3 }]));
      const repository = new ListingsRepository(db as unknown as Database);

      await expect(
        repository.countAssociatedRequests('listing-1'),
      ).resolves.toBe(3);
    });
  });

  describe('countMany', () => {
    it('returns the row count for the same filters findMany would use', async () => {
      const db = makeDb();
      const queryChain = chain([{ value: 7 }]);
      db.select.mockReturnValue(queryChain);
      const repository = new ListingsRepository(db as unknown as Database);

      await expect(
        repository.countMany(
          { pickupLocation: 'Main', limit: 20, offset: 0 },
          adminViewer,
        ),
      ).resolves.toBe(7);
      const { sql, params } = renderWhere(queryChain.where as jest.Mock);
      expect(sql).toContain('ilike');
      expect(params).toContain('%Main%');
    });
  });

  describe('findMany', () => {
    it('returns the rows from the query builder', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseListing]));
      const repository = new ListingsRepository(db as unknown as Database);

      await expect(
        repository.findMany({ limit: 20, offset: 0 }, adminViewer),
      ).resolves.toEqual([baseListing]);
    });

    it('defaults to sorting by useBy ascending', async () => {
      const db = makeDb();
      const queryChain = chain([baseListing]);
      db.select.mockReturnValue(queryChain);
      const repository = new ListingsRepository(db as unknown as Database);

      await repository.findMany({ limit: 20, offset: 0 }, adminViewer);

      const [orderArg] = (queryChain.orderBy as jest.Mock).mock
        .calls[0] as SQL[];
      const { column, direction } = sortedColumnAndDirection(orderArg);
      expect(column).toBe(listings.useBy);
      expect(direction).toContain('asc');
    });

    it('sorts by the requested field and direction', async () => {
      const db = makeDb();
      const queryChain = chain([baseListing]);
      db.select.mockReturnValue(queryChain);
      const repository = new ListingsRepository(db as unknown as Database);

      await repository.findMany(
        {
          sortBy: 'remainingQuantity',
          sortOrder: 'desc',
          limit: 20,
          offset: 0,
        },
        adminViewer,
      );

      const [orderArg] = (queryChain.orderBy as jest.Mock).mock
        .calls[0] as SQL[];
      const { column, direction } = sortedColumnAndDirection(orderArg);
      expect(column).toBe(listings.remainingQuantity);
      expect(direction).toContain('desc');
    });

    it('matches pickupLocation as a substring, not an exact value', async () => {
      const db = makeDb();
      const queryChain = chain([baseListing]);
      db.select.mockReturnValue(queryChain);
      const repository = new ListingsRepository(db as unknown as Database);

      await repository.findMany(
        {
          pickupLocation: 'Main',
          limit: 20,
          offset: 0,
        },
        adminViewer,
      );

      const { sql, params } = renderWhere(queryChain.where as jest.Mock);
      expect(sql).toContain('ilike');
      expect(params).toContain('%Main%');
    });

    it('applies from/to as an inclusive range on the requested timestamp column', async () => {
      const db = makeDb();
      const queryChain = chain([baseListing]);
      db.select.mockReturnValue(queryChain);
      const repository = new ListingsRepository(db as unknown as Database);

      await repository.findMany(
        {
          useByFrom: '2026-08-01T00:00:00Z',
          useByTo: '2026-08-31T00:00:00Z',
          limit: 20,
          offset: 0,
        },
        adminViewer,
      );

      const { sql, params } = renderWhere(queryChain.where as jest.Mock);
      expect(sql).toContain('"use_by" >=');
      expect(sql).toContain('"use_by" <=');
      expect(params).toContain(new Date('2026-08-01T00:00:00Z').toISOString());
      expect(params).toContain(new Date('2026-08-31T00:00:00Z').toISOString());
    });

    it('resolves donorOrgName to a donor_org_id filter via an organisation name lookup', async () => {
      const db = makeDb();
      const orgChain = chain([{ id: 'org-1' }]);
      const listingsChain = chain([baseListing]);
      db.select
        .mockReturnValueOnce(orgChain)
        .mockReturnValueOnce(listingsChain);
      const repository = new ListingsRepository(db as unknown as Database);

      await repository.findMany(
        {
          donorOrgName: 'Acme Foods',
          limit: 20,
          offset: 0,
        },
        adminViewer,
      );

      expect(db.select).toHaveBeenNthCalledWith(1, expect.anything());
      const { sql, params } = renderWhere(orgChain.where as jest.Mock);
      expect(sql).toContain('ilike');
      expect(params).toContain('Acme Foods');
      expect(listingsChain.where).toHaveBeenCalled();
    });

    it("does not filter by status/org for an admin viewer (sees every listing's draft or not)", async () => {
      const db = makeDb();
      const queryChain = chain([baseListing]);
      db.select.mockReturnValue(queryChain);
      const repository = new ListingsRepository(db as unknown as Database);

      await repository.findMany({ limit: 20, offset: 0 }, adminViewer);

      const { sql, params } = renderWhere(queryChain.where as jest.Mock);
      expect(sql).not.toContain('"status" <>');
      expect(params).not.toContain('draft');
    });

    it('restricts draft listings to the donor org for a non-admin viewer with an org', async () => {
      const db = makeDb();
      const queryChain = chain([baseListing]);
      db.select.mockReturnValue(queryChain);
      const repository = new ListingsRepository(db as unknown as Database);
      const viewer: AuthenticatedUser = {
        userId: 'user-1',
        role: 'user',
        orgId: 'org-1',
      };

      await repository.findMany({ limit: 20, offset: 0 }, viewer);

      const { sql, params } = renderWhere(queryChain.where as jest.Mock);
      expect(sql).toContain('"status" <>');
      expect(sql).toContain('"donor_org_id" =');
      expect(params).toContain('draft');
      expect(params).toContain('org-1');
    });

    it('excludes draft listings entirely for a viewer with no org', async () => {
      const db = makeDb();
      const queryChain = chain([baseListing]);
      db.select.mockReturnValue(queryChain);
      const repository = new ListingsRepository(db as unknown as Database);
      const viewer: AuthenticatedUser = { userId: 'user-1', role: 'user' };

      await repository.findMany({ limit: 20, offset: 0 }, viewer);

      const { sql, params } = renderWhere(queryChain.where as jest.Mock);
      expect(sql).toContain('"status" <>');
      expect(sql).not.toContain('"donor_org_id" =');
      expect(params).toContain('draft');
      expect(params).not.toContain('org-1');
    });
  });
});
