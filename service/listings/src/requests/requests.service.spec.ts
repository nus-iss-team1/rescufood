import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/types/express';
import { RequestsRepository } from './requests.repository';
import { RequestsService } from './requests.service';

function makeRepository() {
  return {
    create: jest.fn(),
    findByIdempotencyKey: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    countMany: jest.fn().mockResolvedValue(0),
    findListingById: jest.fn(),
    updateStatus: jest.fn(),
    decrementListingQuantity: jest.fn(),
    incrementListingQuantity: jest.fn(),
  };
}

// A transaction "connection" distinct from `undefined`/the repository's
// default executor, so tests can assert repository calls made *inside*
// db.transaction(...) were given this token rather than the plain db.
const TX_TOKEN = Symbol('tx');

function makeDb() {
  return {
    transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(TX_TOKEN)),
  };
}

function makeService(repository: ReturnType<typeof makeRepository>) {
  const db = makeDb();
  const service = new RequestsService(
    repository as unknown as RequestsRepository,
    db as never,
  );
  return { service, db };
}

const rescueUser: AuthenticatedUser = {
  userId: 'user-rescue',
  role: 'user',
  orgId: 'org-rescue',
};
const donorUser: AuthenticatedUser = {
  userId: 'user-donor',
  role: 'user',
  orgId: 'org-donor',
};
const outsider: AuthenticatedUser = {
  userId: 'user-outsider',
  role: 'user',
  orgId: 'org-outsider',
};

const availableListing = {
  id: 'listing-1',
  donorOrgId: 'org-donor',
  status: 'available' as const,
  remainingQuantity: '10.00',
  unit: 'kg',
};

const baseRequest = {
  id: 'request-1',
  listingId: 'listing-1',
  rescueOrgId: 'org-rescue',
  claimedBy: 'user-rescue',
  idempotencyKey: 'idem-1',
  status: 'pending' as const,
  requestedQuantity: '5.00',
};

describe('RequestsService', () => {
  describe('create', () => {
    const dto = {
      listingId: 'listing-1',
      requestedQuantity: 5,
      idempotencyKey: 'idem-1',
    };

    it('creates a request against an available listing', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.create.mockResolvedValue(baseRequest);
      const { service } = makeService(repository);

      const result = await service.create(dto, rescueUser);

      expect(result).toEqual(baseRequest);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          listingId: 'listing-1',
          rescueOrgId: 'org-rescue',
          claimedBy: 'user-rescue',
          idempotencyKey: 'idem-1',
          requestedQuantity: '5',
        }),
      );
    });

    it('404s when the listing does not exist', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(undefined);
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a listing that is not available', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue({
        ...availableListing,
        status: 'draft',
      });
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a donor org requesting its own listing', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(service.create(dto, donorUser)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a requested quantity greater than what remains', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.create({ ...dto, requestedQuantity: 50 }, rescueUser),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('replays the existing request when the idempotency key was already used', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.create.mockRejectedValue({ code: '23505' });
      repository.findByIdempotencyKey.mockResolvedValue(baseRequest);
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).resolves.toEqual(
        baseRequest,
      );
    });

    it('rethrows when the unique violation does not resolve to an existing row', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.create.mockRejectedValue({ code: '23505' });
      repository.findByIdempotencyKey.mockResolvedValue(undefined);
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).rejects.toEqual({
        code: '23505',
      });
    });
  });

  describe('findOne', () => {
    it('returns the request when the viewer is the rescue org', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(service.findOne('request-1', rescueUser)).resolves.toEqual(
        baseRequest,
      );
    });

    it('returns the request when the viewer is the donor org', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(service.findOne('request-1', donorUser)).resolves.toEqual(
        baseRequest,
      );
    });

    it('404s an outsider rather than exposing existence', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.findOne('request-1', outsider),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s when the request does not exist', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(undefined);
      const { service } = makeService(repository);

      await expect(
        service.findOne('missing', rescueUser),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('decide - accept', () => {
    const dto = { status: 'accepted' as const };

    it('decrements the listing quantity and marks the request accepted', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.decrementListingQuantity.mockResolvedValue({
        ...availableListing,
        remainingQuantity: '5.00',
      });
      repository.updateStatus.mockResolvedValue({
        ...baseRequest,
        status: 'accepted',
      });
      const { service, db } = makeService(repository);

      const result = await service.decide('request-1', dto, donorUser);

      expect(result.status).toBe('accepted');
      expect(repository.decrementListingQuantity).toHaveBeenCalledWith(
        'listing-1',
        '5.00',
        expect.anything(),
      );
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'request-1',
        'pending',
        expect.objectContaining({
          status: 'accepted',
          respondedBy: donorUser.userId,
        }),
        expect.anything(),
      );
      expect(db.transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects when a rescue org tries to accept its own request', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, rescueUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('409s when the listing no longer has enough remaining quantity', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.decrementListingQuantity.mockResolvedValue(undefined);
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, donorUser),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('translates a check-constraint violation into a ConflictException', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.decrementListingQuantity.mockRejectedValue({
        code: '23514',
      });
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, donorUser),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('409s when the request was decided concurrently between the read and the write', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.decrementListingQuantity.mockResolvedValue(availableListing);
      repository.updateStatus.mockResolvedValue(undefined);
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, donorUser),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects re-accepting a request that is not pending', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseRequest,
        status: 'accepted',
      });
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, donorUser),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.decrementListingQuantity).not.toHaveBeenCalled();
    });
  });

  describe('decide - decline', () => {
    const dto = { status: 'declined' as const, declineReason: 'out of stock' };

    it('marks the request declined without touching listing quantity', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.updateStatus.mockResolvedValue({
        ...baseRequest,
        status: 'declined',
      });
      const { service } = makeService(repository);

      const result = await service.decide('request-1', dto, donorUser);

      expect(result.status).toBe('declined');
      expect(repository.decrementListingQuantity).not.toHaveBeenCalled();
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'request-1',
        'pending',
        expect.objectContaining({
          status: 'declined',
          declineReason: 'out of stock',
        }),
        expect.anything(),
      );
    });

    it('rejects when the caller is not the donor org', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, outsider),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('decide - cancel', () => {
    const dto = {
      status: 'cancelled' as const,
      cancellationReason: 'no longer needed',
    };

    it('allows the rescue org to cancel its own pending request', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.updateStatus.mockResolvedValue({
        ...baseRequest,
        status: 'cancelled',
      });
      const { service } = makeService(repository);

      const result = await service.decide('request-1', dto, rescueUser);

      expect(result.status).toBe('cancelled');
      expect(repository.incrementListingQuantity).not.toHaveBeenCalled();
    });

    it('allows the donor org to cancel too', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.updateStatus.mockResolvedValue({
        ...baseRequest,
        status: 'cancelled',
      });
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, donorUser),
      ).resolves.toMatchObject({ status: 'cancelled' });
    });

    it('rejects an outsider', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, outsider),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('restores the listing quantity when cancelling an accepted request', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseRequest,
        status: 'accepted',
      });
      repository.findListingById.mockResolvedValue({
        ...availableListing,
        status: 'reserved',
        remainingQuantity: '0.00',
      });
      repository.updateStatus.mockResolvedValue({
        ...baseRequest,
        status: 'cancelled',
      });
      const { service } = makeService(repository);

      await service.decide('request-1', dto, rescueUser);

      expect(repository.incrementListingQuantity).toHaveBeenCalledWith(
        'listing-1',
        '5.00',
        expect.anything(),
      );
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'request-1',
        'accepted',
        expect.anything(),
        expect.anything(),
      );
    });

    it('does not restore quantity when cancelling a still-pending request', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest); // status: pending
      repository.findListingById.mockResolvedValue(availableListing);
      repository.updateStatus.mockResolvedValue({
        ...baseRequest,
        status: 'cancelled',
      });
      const { service } = makeService(repository);

      await service.decide('request-1', dto, rescueUser);

      expect(repository.incrementListingQuantity).not.toHaveBeenCalled();
    });
  });
});
