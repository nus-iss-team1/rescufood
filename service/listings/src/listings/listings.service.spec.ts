import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { AuthenticatedUser } from '../common/types/express';
import type { Database } from '../db/db.module';
import { listings } from '../db/schema';
import { ListingsService } from './listings.service';

// asc()/desc() build a SQL fragment as [prefix, column, ' asc' | ' desc'];
// this reaches into that shape to assert which column and direction the
// service asked the query builder to sort by.
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
// to drive the service without a real Postgres connection.
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

function rejectingChain(error: unknown) {
  const self: Record<string, unknown> = {
    then: (_resolve: unknown, reject: (e: unknown) => void) => reject(error),
  };
  for (const method of ['values', 'returning', 'from', 'where', 'set']) {
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

const owner: AuthenticatedUser = {
  userId: 'user-1',
  role: 'user',
  orgId: 'org-1',
};
const otherUser: AuthenticatedUser = {
  userId: 'user-2',
  role: 'user',
  orgId: 'org-2',
};
const admin: AuthenticatedUser = {
  userId: 'admin-1',
  role: 'admin',
  orgId: 'org-1',
};

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

const validCreateDto = {
  category: 'produce' as const,
  description: 'Fresh vegetables',
  remainingQuantity: 10,
  unit: 'kg',
  useBy: '2026-08-10T00:00:00Z',
  pickupLocation: '123 Main St',
  pickupWindowStart: '2026-08-09T09:00:00Z',
  pickupWindowEnd: '2026-08-09T17:00:00Z',
};

describe('ListingsService', () => {
  describe('create', () => {
    it('inserts and returns the created listing', async () => {
      const db = makeDb();
      db.insert.mockReturnValue(chain([baseListing]));
      const service = new ListingsService(db as unknown as Database);

      const result = await service.create(validCreateDto, owner);

      expect(result).toEqual(baseListing);
      expect(db.insert).toHaveBeenCalled();
    });

    it('rejects when the pickup window is inverted', async () => {
      const db = makeDb();
      const service = new ListingsService(db as unknown as Database);

      await expect(
        service.create(
          {
            ...validCreateDto,
            pickupWindowStart: '2026-08-09T17:00:00Z',
            pickupWindowEnd: '2026-08-09T09:00:00Z',
          },
          owner,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the listing when found', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseListing]));
      const service = new ListingsService(db as unknown as Database);

      await expect(service.findOne('listing-1')).resolves.toEqual(baseListing);
    });

    it('throws NotFoundException when missing', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([]));
      const service = new ListingsService(db as unknown as Database);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when the caller is not the owner or an admin', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseListing]));
      const service = new ListingsService(db as unknown as Database);

      await expect(
        service.update('listing-1', { version: 1 }, otherUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.update).not.toHaveBeenCalled();
    });

    it('allows an admin to update a listing they do not own', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseListing]));
      db.update.mockReturnValue(chain([{ ...baseListing, version: 2 }]));
      const service = new ListingsService(db as unknown as Database);

      const result = await service.update('listing-1', { version: 1 }, admin);

      expect(result.version).toBe(2);
    });

    it('throws ConflictException when the version has moved on', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseListing]));
      db.update.mockReturnValue(chain([])); // no row matched id + version
      const service = new ListingsService(db as unknown as Database);

      await expect(
        service.update('listing-1', { version: 1 }, owner),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when the resulting pickup window is inverted', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseListing]));
      const service = new ListingsService(db as unknown as Database);

      await expect(
        service.update(
          'listing-1',
          { version: 1, pickupWindowStart: '2026-08-09T20:00:00Z' },
          owner,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.update).not.toHaveBeenCalled();
    });

    it('translates a check-constraint violation into a BadRequestException', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseListing]));
      db.update.mockReturnValue(
        rejectingChain({
          code: '23514',
          detail: 'remaining_quantity_non_negative',
        }),
      );
      const service = new ListingsService(db as unknown as Database);

      await expect(
        service.update('listing-1', { version: 1 }, owner),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when the caller is not the owner or an admin', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseListing]));
      const service = new ListingsService(db as unknown as Database);

      await expect(
        service.remove('listing-1', otherUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('deletes the listing when the caller owns it', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseListing]));
      db.delete.mockReturnValue(chain(undefined));
      const service = new ListingsService(db as unknown as Database);

      await service.remove('listing-1', owner);

      expect(db.delete).toHaveBeenCalled();
    });

    it('translates a foreign-key violation into a ConflictException', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseListing]));
      db.delete.mockReturnValue(rejectingChain({ code: '23503' }));
      const service = new ListingsService(db as unknown as Database);

      await expect(service.remove('listing-1', owner)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('returns the listings from the query builder', async () => {
      const db = makeDb();
      db.select.mockReturnValue(chain([baseListing]));
      const service = new ListingsService(db as unknown as Database);

      await expect(service.findAll({ limit: 20, offset: 0 })).resolves.toEqual([
        baseListing,
      ]);
    });

    it('defaults to sorting by useBy ascending', async () => {
      const db = makeDb();
      const queryChain = chain([baseListing]);
      db.select.mockReturnValue(queryChain);
      const service = new ListingsService(db as unknown as Database);

      await service.findAll({ limit: 20, offset: 0 });

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
      const service = new ListingsService(db as unknown as Database);

      await service.findAll({
        sortBy: 'remainingQuantity',
        sortOrder: 'desc',
        limit: 20,
        offset: 0,
      });

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
      const service = new ListingsService(db as unknown as Database);

      await service.findAll({
        pickupLocation: 'Main',
        limit: 20,
        offset: 0,
      });

      const { sql, params } = renderWhere(queryChain.where as jest.Mock);
      expect(sql).toContain('ilike');
      expect(params).toContain('%Main%');
    });

    it('applies from/to as an inclusive range on the requested timestamp column', async () => {
      const db = makeDb();
      const queryChain = chain([baseListing]);
      db.select.mockReturnValue(queryChain);
      const service = new ListingsService(db as unknown as Database);

      await service.findAll({
        useByFrom: '2026-08-01T00:00:00Z',
        useByTo: '2026-08-31T00:00:00Z',
        limit: 20,
        offset: 0,
      });

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
      const service = new ListingsService(db as unknown as Database);

      await service.findAll({
        donorOrgName: 'Acme Foods',
        limit: 20,
        offset: 0,
      });

      expect(db.select).toHaveBeenNthCalledWith(1, expect.anything());
      const { sql, params } = renderWhere(orgChain.where as jest.Mock);
      expect(sql).toContain('ilike');
      expect(params).toContain('Acme Foods');
      expect(listingsChain.where).toHaveBeenCalled();
    });
  });
});
