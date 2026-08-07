import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/types/express';
import { hashPickupCode } from './pickup/pickup-code.util';
import { RequestsRepository } from './requests.repository';
import { RequestsService } from './requests.service';

// RequestsService.verifyPickupCode resolves the code-generator's *current*
// org via this, the same helper OrgMembershipGuard uses - mocked here so
// tests control it directly instead of faking a drizzle select chain.
jest.mock('../auth/org-membership.guard', () => ({
  resolveOrgId: jest.fn(),
}));
import { resolveOrgId } from '../auth/org-membership.guard';
const mockResolveOrgId = resolveOrgId as jest.Mock;

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
    incrementPickupCodeAttempts: jest.fn(),
    supersedeOtherPending: jest.fn().mockResolvedValue(0),
    markListingCollectedIfDone: jest.fn().mockResolvedValue(false),
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

function makeLogger() {
  return { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

function makeService(repository: ReturnType<typeof makeRepository>) {
  const db = makeDb();
  const logger = makeLogger();
  const service = new RequestsService(
    repository as unknown as RequestsRepository,
    db as never,
    logger as never,
  );
  return { service, db, logger };
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
  beforeEach(() => {
    mockResolveOrgId.mockReset();
  });

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
      expect(repository.supersedeOtherPending).not.toHaveBeenCalled();
    });

    it('supersedes other pending requests on the listing when this accept fully reserves it', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.decrementListingQuantity.mockResolvedValue({
        ...availableListing,
        status: 'reserved',
        remainingQuantity: '0.00',
      });
      repository.supersedeOtherPending.mockResolvedValue(2);
      repository.updateStatus.mockResolvedValue({
        ...baseRequest,
        status: 'accepted',
      });
      const { service, logger } = makeService(repository);

      await service.decide('request-1', dto, donorUser);

      expect(repository.supersedeOtherPending).toHaveBeenCalledWith(
        'listing-1',
        'request-1',
        expect.anything(),
      );
      expect(logger.log).toHaveBeenCalledWith(
        { listingId: 'listing-1', supersededCount: 2 },
        expect.stringContaining('superseded'),
      );
    });

    it('does not log when nothing else was pending to supersede', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.decrementListingQuantity.mockResolvedValue({
        ...availableListing,
        status: 'reserved',
        remainingQuantity: '0.00',
      });
      repository.supersedeOtherPending.mockResolvedValue(0);
      repository.updateStatus.mockResolvedValue({
        ...baseRequest,
        status: 'accepted',
      });
      const { service, logger } = makeService(repository);

      await service.decide('request-1', dto, donorUser);

      expect(logger.log).not.toHaveBeenCalled();
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

  describe('decide - no_show', () => {
    const dto = {
      status: 'no_show' as const,
      noShowReason: 'nobody came to collect it',
    };

    it('allows either party to report a no-show on an accepted request', async () => {
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
        status: 'no_show',
      });
      const { service } = makeService(repository);

      const result = await service.decide('request-1', dto, donorUser);

      expect(result.status).toBe('no_show');
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'request-1',
        'accepted',
        expect.objectContaining({
          status: 'no_show',
          noShowReason: 'nobody came to collect it',
        }),
        expect.anything(),
      );
    });

    it('restores the listing quantity, same as a cancelled accepted request', async () => {
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
        status: 'no_show',
      });
      const { service } = makeService(repository);

      await service.decide('request-1', dto, rescueUser);

      expect(repository.incrementListingQuantity).toHaveBeenCalledWith(
        'listing-1',
        '5.00',
        expect.anything(),
      );
    });

    it('rejects an outsider', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseRequest,
        status: 'accepted',
      });
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, outsider),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects reporting a no-show on a request that is still pending', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest); // status: pending
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, rescueUser),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('generatePickupCode', () => {
    const acceptedRequest = {
      ...baseRequest,
      status: 'accepted' as const,
    };

    it('generates a 6-digit code, hashes it for storage, and returns the raw code once', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.updateStatus.mockResolvedValue({
        ...acceptedRequest,
        pickupCodeHash: 'irrelevant-to-the-caller',
      });
      const { service } = makeService(repository);

      const result = await service.generatePickupCode('request-1', rescueUser);

      expect(result.code).toMatch(/^\d{6}$/);
      expect(result.expiresAt).toBeInstanceOf(Date);
      const [, , values] = repository.updateStatus.mock.calls[0] as [
        string,
        string,
        {
          pickupCodeHash: string;
          codeGeneratedBy: string;
          pickupCodeAttempts: number;
        },
      ];
      expect(values.pickupCodeHash).toBe(hashPickupCode(result.code));
      expect(values.codeGeneratedBy).toBe(rescueUser.userId);
      expect(values.pickupCodeAttempts).toBe(0);
    });

    it('allows either party to generate a code', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.updateStatus.mockResolvedValue(acceptedRequest);
      const { service } = makeService(repository);

      await expect(
        service.generatePickupCode('request-1', donorUser),
      ).resolves.toMatchObject({ code: expect.any(String) as string });
    });

    it('rejects an outsider', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.generatePickupCode('request-1', outsider),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects generating a code for a request that is not accepted', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest); // status: pending
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.generatePickupCode('request-1', rescueUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('409s when the request was modified since it was read', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.updateStatus.mockResolvedValue(undefined);
      const { service } = makeService(repository);

      await expect(
        service.generatePickupCode('request-1', rescueUser),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('verifyPickupCode', () => {
    const code = '123456';
    const now = new Date('2026-08-06T01:00:00Z');
    const acceptedRequest = {
      ...baseRequest,
      status: 'accepted' as const,
      pickupCodeHash: hashPickupCode(code),
      codeExpiresAt: new Date(now.getTime() + 60_000),
      codeGeneratedBy: 'user-rescue',
      pickupCodeAttempts: 0,
    };

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('completes the request when the code matches and is unexpired', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      // Generated by the rescue org, so the donor org must be the one to verify.
      mockResolveOrgId.mockResolvedValue('org-rescue');
      repository.updateStatus.mockResolvedValue({
        ...acceptedRequest,
        status: 'completed',
      });
      const { service } = makeService(repository);

      const result = await service.verifyPickupCode(
        'request-1',
        { code },
        donorUser,
      );

      expect(result.status).toBe('completed');
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'request-1',
        'accepted',
        expect.objectContaining({
          status: 'completed',
          verifiedBy: donorUser.userId,
          collectedQuantity: '5',
        }),
        expect.anything(),
      );
    });

    it('defaults collectedQuantity to the full requestedQuantity when omitted', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      repository.updateStatus.mockResolvedValue({
        ...acceptedRequest,
        status: 'completed',
      });
      const { service } = makeService(repository);

      await service.verifyPickupCode('request-1', { code }, donorUser);

      expect(repository.updateStatus).toHaveBeenCalledWith(
        'request-1',
        'accepted',
        expect.objectContaining({ collectedQuantity: '5' }),
        expect.anything(),
      );
    });

    it('checks whether the listing can now be marked collected', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      repository.updateStatus.mockResolvedValue({
        ...acceptedRequest,
        status: 'completed',
      });
      repository.markListingCollectedIfDone.mockResolvedValue(true);
      const { service, logger } = makeService(repository);

      await service.verifyPickupCode('request-1', { code }, donorUser);

      expect(repository.markListingCollectedIfDone).toHaveBeenCalledWith(
        'listing-1',
        expect.anything(),
      );
      expect(logger.log).toHaveBeenCalledWith(
        { listingId: 'listing-1' },
        expect.stringContaining('collected'),
      );
    });

    it('does not log when other accepted requests are still outstanding', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      repository.updateStatus.mockResolvedValue({
        ...acceptedRequest,
        status: 'completed',
      });
      repository.markListingCollectedIfDone.mockResolvedValue(false);
      const { service, logger } = makeService(repository);

      await service.verifyPickupCode('request-1', { code }, donorUser);

      expect(logger.log).not.toHaveBeenCalled();
    });

    it('rejects a collectedQuantity greater than what was requested', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode(
          'request-1',
          { code, collectedQuantity: 50 },
          donorUser,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('rejects when the same org generated and is trying to verify the code', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode('request-1', { code }, rescueUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.incrementPickupCodeAttempts).not.toHaveBeenCalled();
    });

    it('rejects an outsider entirely', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode('request-1', { code }, outsider),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when no code has been generated yet', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseRequest,
        status: 'accepted',
      });
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode('request-1', { code }, donorUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects verifying a request that is not accepted', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...acceptedRequest,
        status: 'completed',
      });
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode('request-1', { code }, donorUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('gives the same generic error for a wrong code as for an expired one', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      repository.incrementPickupCodeAttempts.mockResolvedValue(1);

      repository.findById.mockResolvedValue(acceptedRequest);
      const { service: wrongCodeService } = makeService(repository);
      let wrongCodeError: unknown;
      try {
        await wrongCodeService.verifyPickupCode(
          'request-1',
          { code: '000000' },
          donorUser,
        );
      } catch (err) {
        wrongCodeError = err;
      }

      repository.findById.mockResolvedValue({
        ...acceptedRequest,
        codeExpiresAt: new Date(now.getTime() - 1),
      });
      const { service: expiredCodeService } = makeService(repository);
      let expiredCodeError: unknown;
      try {
        await expiredCodeService.verifyPickupCode(
          'request-1',
          { code },
          donorUser,
        );
      } catch (err) {
        expiredCodeError = err;
      }

      expect(wrongCodeError).toBeInstanceOf(BadRequestException);
      expect(expiredCodeError).toBeInstanceOf(BadRequestException);
      expect((wrongCodeError as BadRequestException).message).toBe(
        (expiredCodeError as BadRequestException).message,
      );
    });

    it('counts a failed attempt and does not complete the request', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      repository.incrementPickupCodeAttempts.mockResolvedValue(2);
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode('request-1', { code: '000000' }, donorUser),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.incrementPickupCodeAttempts).toHaveBeenCalledWith(
        'request-1',
        now,
      );
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('force-invalidates the code after hitting the attempt cap', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      repository.incrementPickupCodeAttempts.mockResolvedValue(5);
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode('request-1', { code: '000000' }, donorUser),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'request-1',
        'accepted',
        expect.objectContaining({
          pickupCodeHash: null,
          codeExpiresAt: null,
          codeGeneratedBy: null,
          pickupCodeAttempts: 0,
        }),
      );
    });

    it('409s when the request stopped being accepted mid-verify', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      repository.incrementPickupCodeAttempts.mockResolvedValue(undefined);
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode('request-1', { code: '000000' }, donorUser),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('409s when the request was modified since it was read on a successful verify', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      repository.updateStatus.mockResolvedValue(undefined);
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode('request-1', { code }, donorUser),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('lets an admin verify regardless of org, without the cross-org check', async () => {
      const repository = makeRepository();
      const admin: AuthenticatedUser = {
        userId: 'admin-1',
        role: 'admin',
        orgId: 'org-rescue', // same org as the generator - would fail the check for a non-admin
      };
      repository.findById.mockResolvedValue(acceptedRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.updateStatus.mockResolvedValue({
        ...acceptedRequest,
        status: 'completed',
      });
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode('request-1', { code }, admin),
      ).resolves.toMatchObject({ status: 'completed' });
      expect(mockResolveOrgId).not.toHaveBeenCalled();
    });
  });
});
