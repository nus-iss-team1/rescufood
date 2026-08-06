import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/types/express';
import { ListingsRepository } from './listings.repository';
import { ListingsService } from './listings.service';

function makeRepository() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    updateWithVersion: jest.fn(),
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
      const repository = makeRepository();
      repository.create.mockResolvedValue(baseListing);
      const service = new ListingsService(
        repository as unknown as ListingsRepository,
      );

      const result = await service.create(validCreateDto, owner);

      expect(result).toEqual(baseListing);
      // donorOrgId comes from the caller's own membership, never the DTO -
      // see OrgMembershipGuard.
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ donorOrgId: 'org-1', createdBy: 'user-1' }),
      );
    });

    it('rejects when the pickup window is inverted', async () => {
      const repository = makeRepository();
      const service = new ListingsService(
        repository as unknown as ListingsRepository,
      );

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
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the listing when found', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      const service = new ListingsService(
        repository as unknown as ListingsRepository,
      );

      await expect(service.findOne('listing-1')).resolves.toEqual(baseListing);
    });

    it('throws NotFoundException when missing', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(undefined);
      const service = new ListingsService(
        repository as unknown as ListingsRepository,
      );

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when the caller is not the owner or an admin', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      const service = new ListingsService(
        repository as unknown as ListingsRepository,
      );

      await expect(
        service.update('listing-1', { version: 1 }, otherUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('allows an admin to update a listing they do not own', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      repository.updateWithVersion.mockResolvedValue({
        ...baseListing,
        version: 2,
      });
      const service = new ListingsService(
        repository as unknown as ListingsRepository,
      );

      const result = await service.update('listing-1', { version: 1 }, admin);

      expect(result.version).toBe(2);
    });

    it('throws ConflictException when the version has moved on', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      repository.updateWithVersion.mockResolvedValue(undefined); // no row matched id + version
      const service = new ListingsService(
        repository as unknown as ListingsRepository,
      );

      await expect(
        service.update('listing-1', { version: 1 }, owner),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when the resulting pickup window is inverted', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      const service = new ListingsService(
        repository as unknown as ListingsRepository,
      );

      await expect(
        service.update(
          'listing-1',
          { version: 1, pickupWindowStart: '2026-08-09T20:00:00Z' },
          owner,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('translates a check-constraint violation into a BadRequestException', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      repository.updateWithVersion.mockRejectedValue({
        code: '23514',
        detail: 'remaining_quantity_non_negative',
      });
      const service = new ListingsService(
        repository as unknown as ListingsRepository,
      );

      await expect(
        service.update('listing-1', { version: 1 }, owner),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when the caller is not the owner or an admin', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      const service = new ListingsService(
        repository as unknown as ListingsRepository,
      );

      await expect(
        service.remove('listing-1', otherUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes the listing when the caller owns it', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      repository.delete.mockResolvedValue(undefined);
      const service = new ListingsService(
        repository as unknown as ListingsRepository,
      );

      await service.remove('listing-1', owner);

      expect(repository.delete).toHaveBeenCalledWith('listing-1');
    });

    it('translates a foreign-key violation into a ConflictException', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseListing);
      repository.delete.mockRejectedValue({ code: '23503' });
      const service = new ListingsService(
        repository as unknown as ListingsRepository,
      );

      await expect(service.remove('listing-1', owner)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('delegates to the repository and returns its results', async () => {
      const repository = makeRepository();
      repository.findMany.mockResolvedValue([baseListing]);
      const service = new ListingsService(
        repository as unknown as ListingsRepository,
      );

      const query = { limit: 20, offset: 0 };
      await expect(service.findAll(query)).resolves.toEqual([baseListing]);
      expect(repository.findMany).toHaveBeenCalledWith(query);
    });
  });
});
