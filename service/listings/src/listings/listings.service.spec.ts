import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/types/express';
import type { Database } from '../db/db.module';
import { ListingsService } from './listings.service';

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

const owner: AuthenticatedUser = { userId: 'user-1', role: 'user' };
const otherUser: AuthenticatedUser = { userId: 'user-2', role: 'user' };
const admin: AuthenticatedUser = { userId: 'admin-1', role: 'admin' };

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
  donorOrgId: 'org-1',
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
  });
});
