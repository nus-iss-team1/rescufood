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
  resolveOrgIdByUserId: jest.fn(),
}));
import { resolveOrgIdByUserId } from '../auth/org-membership.guard';
const mockResolveOrgId = resolveOrgIdByUserId as jest.Mock;

function makeRepository() {
  return {
    create: jest.fn(),
    findByIdempotencyKey: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findMany: jest.fn(),
    countMany: jest.fn().mockResolvedValue(0),
    findListingById: jest.fn(),
    findClaimantContext: jest.fn().mockResolvedValue({
      userStatus: 'active',
      orgType: 'rescue_partner',
      orgStatus: 'approved',
    }),
    reserveListingForClaim: jest.fn(),
    updateStatus: jest.fn(),
    reopenListingAfterClaimEnded: jest.fn(),
    incrementPickupCodeAttempts: jest.fn(),
    markListingCollectedIfDone: jest.fn().mockResolvedValue(false),
    findOrgContacts: jest.fn().mockResolvedValue([]),
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

function makeAudit() {
  return { record: jest.fn().mockResolvedValue(undefined) };
}

function makeNotifications() {
  return {
    claimCreated: jest.fn().mockResolvedValue(undefined),
    claimEnded: jest.fn().mockResolvedValue(undefined),
    pickupCompleted: jest.fn().mockResolvedValue(undefined),
    listingExpired: jest.fn().mockResolvedValue(undefined),
  };
}

function makeService(repository: ReturnType<typeof makeRepository>) {
  const db = makeDb();
  const logger = makeLogger();
  const audit = makeAudit();
  const notifications = makeNotifications();
  const service = new RequestsService(
    repository as unknown as RequestsRepository,
    audit as never,
    notifications as never,
    db as never,
    logger as never,
  );
  return { service, db, logger, audit, notifications };
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
  description: 'Surplus food',
  quantity: '10.00',
  unit: 'kg',
  pickupLocation: 'Loc A',
  pickupWindowStart: new Date('2098-12-31T00:00:00Z'),
  pickupWindowEnd: new Date('2099-01-01T00:00:00Z'),
};

const reservedListing = {
  ...availableListing,
  status: 'reserved' as const,
};

const baseRequest = {
  id: 'request-1',
  listingId: 'listing-1',
  rescueOrgId: 'org-rescue',
  claimedBy: 'user-rescue',
  idempotencyKey: 'idem-1',
  status: 'active' as const,
  requestedQuantity: '10.00',
};

describe('RequestsService', () => {
  beforeEach(() => {
    mockResolveOrgId.mockReset();
  });

  describe('create', () => {
    const dto = { listingId: 'listing-1', idempotencyKey: 'idem-1' };

    it('reserves the listing and creates one full-lot claim in a transaction', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.reserveListingForClaim.mockResolvedValue(reservedListing);
      repository.create.mockResolvedValue(baseRequest);
      const { service, db, audit } = makeService(repository);

      const result = await service.create(dto, rescueUser);

      expect(result).toEqual(baseRequest);
      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(repository.reserveListingForClaim).toHaveBeenCalledWith(
        'listing-1',
        TX_TOKEN,
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          listingId: 'listing-1',
          rescueOrgId: 'org-rescue',
          claimedBy: 'user-rescue',
          idempotencyKey: 'idem-1',
          status: 'active',
          requestedQuantity: '10.00',
        }),
        TX_TOKEN,
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: { userId: 'user-rescue', orgId: 'org-rescue' },
          action: 'claim.created',
          entityType: 'claim',
          entityId: 'request-1',
          metadata: { listingId: 'listing-1', donorOrgId: 'org-donor' },
        }),
        TX_TOKEN,
      );
    });

    it('notifies the donor after the claim commits', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue({
        ...availableListing,
        description: 'Crate of bananas',
      });
      repository.reserveListingForClaim.mockResolvedValue(reservedListing);
      repository.create.mockResolvedValue(baseRequest);
      repository.findOrgContacts.mockResolvedValue([
        { id: 'org-donor', name: 'Fresh Mart', contactEmail: 'donor@x.com' },
        { id: 'org-rescue', name: 'City Harvest', contactEmail: 'r@x.com' },
      ]);
      const { service, notifications } = makeService(repository);

      await service.create(dto, rescueUser);

      expect(notifications.claimCreated).toHaveBeenCalledWith(
        'donor@x.com',
        expect.objectContaining({
          listingDescription: 'Crate of bananas',
          rescueOrgName: 'City Harvest',
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
        status: 'reserved',
      });
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.reserveListingForClaim).not.toHaveBeenCalled();
    });

    it('rejects a listing whose pickup window has already closed', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue({
        ...availableListing,
        pickupWindowEnd: new Date('2000-01-01T00:00:00Z'),
      });
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.reserveListingForClaim).not.toHaveBeenCalled();
    });

    it('rejects a claimant whose account is not active', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.findClaimantContext.mockResolvedValue({
        userStatus: 'suspended',
        orgType: 'rescue_partner',
        orgStatus: 'approved',
      });
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.reserveListingForClaim).not.toHaveBeenCalled();
    });

    it('rejects a claimant whose organisation is not a rescue partner', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.findClaimantContext.mockResolvedValue({
        userStatus: 'active',
        orgType: 'donor',
        orgStatus: 'approved',
      });
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.reserveListingForClaim).not.toHaveBeenCalled();
    });

    it('rejects a claimant whose organisation is not approved', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.findClaimantContext.mockResolvedValue({
        userStatus: 'active',
        orgType: 'rescue_partner',
        orgStatus: 'pending',
      });
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.reserveListingForClaim).not.toHaveBeenCalled();
    });

    it('replays the original claim when the same key was already used', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.findByIdempotencyKey.mockResolvedValue(baseRequest);
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).resolves.toEqual(
        baseRequest,
      );
      expect(repository.findByIdempotencyKey).toHaveBeenCalledWith(
        'org-rescue',
        'idem-1',
      );
      expect(repository.reserveListingForClaim).not.toHaveBeenCalled();
    });

    it('409s when another org claimed the listing first (reserve returns nothing)', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.reserveListingForClaim.mockResolvedValue(undefined);
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('409s when the active-claim unique index rejects a concurrent insert', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.reserveListingForClaim.mockResolvedValue(reservedListing);
      repository.create.mockRejectedValue({
        code: '23505',
        constraint: 'requests_active_claim_per_listing_uq',
      });
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('replays the original when a concurrent retry trips the idempotency index', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.reserveListingForClaim.mockResolvedValue(reservedListing);
      repository.create.mockRejectedValue({
        code: '23505',
        constraint: 'requests_rescue_org_idempotency_key_uq',
      });
      repository.findByIdempotencyKey
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(baseRequest);
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).resolves.toEqual(
        baseRequest,
      );
    });

    it('replays the original when a concurrent retry loses the reserve race', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.reserveListingForClaim.mockResolvedValue(undefined);
      repository.findByIdempotencyKey
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(baseRequest);
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).resolves.toEqual(
        baseRequest,
      );
    });

    it('rethrows an unexpected unique violation', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.reserveListingForClaim.mockResolvedValue(reservedListing);
      repository.create.mockRejectedValue({
        code: '23505',
        constraint: 'some_other_constraint',
      });
      const { service } = makeService(repository);

      await expect(service.create(dto, rescueUser)).rejects.toMatchObject({
        code: '23505',
      });
    });
  });

  describe('findOne', () => {
    it('returns the claim when the viewer is the rescue org', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(service.findOne('request-1', rescueUser)).resolves.toEqual(
        baseRequest,
      );
    });

    it('returns the claim when the viewer is the donor org', async () => {
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

    it('404s when the claim does not exist', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(undefined);
      const { service } = makeService(repository);

      await expect(
        service.findOne('missing', rescueUser),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('decide - cancel', () => {
    const dto = {
      status: 'cancelled' as const,
      cancellationReason: 'no longer needed',
    };

    it('reopens the listing and marks the claim cancelled', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(reservedListing);
      repository.updateStatus.mockResolvedValue({
        ...baseRequest,
        status: 'cancelled',
      });
      const { service, db, audit } = makeService(repository);

      const result = await service.decide('request-1', dto, rescueUser);

      expect(result.status).toBe('cancelled');
      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(repository.reopenListingAfterClaimEnded).toHaveBeenCalledWith(
        'listing-1',
        TX_TOKEN,
      );
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'request-1',
        'active',
        expect.objectContaining({
          status: 'cancelled',
          cancellationReason: 'no longer needed',
        }),
        TX_TOKEN,
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'claim.cancelled',
          entityType: 'claim',
          entityId: 'request-1',
          reason: 'no longer needed',
          metadata: {
            previousStatus: 'active',
            listingId: 'listing-1',
            listingReopened: true,
          },
        }),
        TX_TOKEN,
      );
    });

    it('notifies the donor when the rescue partner cancels', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(reservedListing);
      repository.updateStatus.mockResolvedValue({
        ...baseRequest,
        status: 'cancelled',
      });
      repository.findOrgContacts.mockResolvedValue([
        { id: 'org-donor', name: 'Fresh Mart', contactEmail: 'donor@x.com' },
      ]);
      const { service, notifications } = makeService(repository);

      await service.decide('request-1', dto, rescueUser);

      expect(repository.findOrgContacts).toHaveBeenCalledWith(['org-donor']);
      expect(notifications.claimEnded).toHaveBeenCalledWith(
        'donor@x.com',
        expect.objectContaining({ endedBy: 'rescue_partner' }),
      );
    });

    it('allows the donor org to cancel too', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(reservedListing);
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
      repository.findListingById.mockResolvedValue(reservedListing);
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, outsider),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('rejects cancelling a claim that is not accepted', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseRequest,
        status: 'completed',
      });
      repository.findListingById.mockResolvedValue(reservedListing);
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, rescueUser),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.reopenListingAfterClaimEnded).not.toHaveBeenCalled();
    });

    it('409s when the claim was modified between the read and the write', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(reservedListing);
      repository.updateStatus.mockResolvedValue(undefined);
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, rescueUser),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('decide - no_show', () => {
    const dto = {
      status: 'no_show' as const,
      noShowReason: 'nobody came to collect it',
    };

    it('allows either party to report a no-show and reopens the listing', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(reservedListing);
      repository.updateStatus.mockResolvedValue({
        ...baseRequest,
        status: 'no_show',
      });
      const { service, audit } = makeService(repository);

      const result = await service.decide('request-1', dto, donorUser);

      expect(result.status).toBe('no_show');
      expect(repository.reopenListingAfterClaimEnded).toHaveBeenCalledWith(
        'listing-1',
        TX_TOKEN,
      );
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'request-1',
        'active',
        expect.objectContaining({
          status: 'no_show',
          noShowReason: 'nobody came to collect it',
        }),
        TX_TOKEN,
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'claim.no_show',
          entityId: 'request-1',
          reason: 'nobody came to collect it',
        }),
        TX_TOKEN,
      );
    });

    it('rejects an outsider', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(reservedListing);
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, outsider),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects reporting a no-show on a claim that is not accepted', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseRequest,
        status: 'cancelled',
      });
      repository.findListingById.mockResolvedValue(reservedListing);
      const { service } = makeService(repository);

      await expect(
        service.decide('request-1', dto, rescueUser),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('generatePickupCode', () => {
    const activeRequest = { ...baseRequest, status: 'active' as const };

    it('generates a 6-digit code, hashes it for storage, and returns the raw code once', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(activeRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.updateStatus.mockResolvedValue({
        ...activeRequest,
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

    it('audits the code generation in the same transaction', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(activeRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.updateStatus.mockResolvedValue(activeRequest);
      const { service, db, audit } = makeService(repository);

      await service.generatePickupCode('request-1', rescueUser);

      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'pickup_code.generated',
          entityType: 'claim',
          entityId: 'request-1',
        }),
        TX_TOKEN,
      );
    });

    it('allows either party to generate a code', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(activeRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.updateStatus.mockResolvedValue(activeRequest);
      const { service } = makeService(repository);

      await expect(
        service.generatePickupCode('request-1', donorUser),
      ).resolves.toMatchObject({ code: expect.any(String) as string });
    });

    it('rejects an outsider', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(activeRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.generatePickupCode('request-1', outsider),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects generating a code for a claim that is not accepted', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...baseRequest,
        status: 'completed',
      });
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.generatePickupCode('request-1', rescueUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('409s when the claim was modified since it was read', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(activeRequest);
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
    const activeRequest = {
      ...baseRequest,
      status: 'active' as const,
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

    it('completes the claim when the code matches and is unexpired', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(activeRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      repository.updateStatus.mockResolvedValue({
        ...activeRequest,
        status: 'completed',
      });
      repository.markListingCollectedIfDone.mockResolvedValue(false);
      repository.findOrgContacts.mockResolvedValue([
        { id: 'org-donor', name: 'Fresh Mart', contactEmail: 'donor@x.com' },
        {
          id: 'org-rescue',
          name: 'City Harvest',
          contactEmail: 'rescue@x.com',
        },
      ]);
      const { service, audit, notifications } = makeService(repository);

      const result = await service.verifyPickupCode(
        'request-1',
        { code },
        donorUser,
      );

      expect(result.status).toBe('completed');
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'request-1',
        'active',
        expect.objectContaining({
          status: 'completed',
          verifiedBy: donorUser.userId,
          collectedQuantity: '10',
        }),
        expect.anything(),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'claim.completed',
          entityType: 'claim',
          entityId: 'request-1',
          metadata: { collectedQuantity: '10', listingId: 'listing-1' },
        }),
        expect.anything(),
      );
      // Both parties are told once the pickup is verified.
      expect(notifications.pickupCompleted).toHaveBeenCalledWith(
        'donor@x.com',
        expect.objectContaining({ collectedQuantity: '10 kg' }),
      );
      expect(notifications.pickupCompleted).toHaveBeenCalledWith(
        'rescue@x.com',
        expect.anything(),
      );
    });

    it('defaults collectedQuantity to the full requestedQuantity when omitted', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(activeRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      repository.updateStatus.mockResolvedValue({
        ...activeRequest,
        status: 'completed',
      });
      const { service } = makeService(repository);

      await service.verifyPickupCode('request-1', { code }, donorUser);

      expect(repository.updateStatus).toHaveBeenCalledWith(
        'request-1',
        'active',
        expect.objectContaining({ collectedQuantity: '10' }),
        expect.anything(),
      );
    });

    it('marks the listing collected once the claim is verified', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(activeRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      repository.updateStatus.mockResolvedValue({
        ...activeRequest,
        status: 'completed',
      });
      repository.markListingCollectedIfDone.mockResolvedValue(true);
      const { service, logger, audit } = makeService(repository);

      await service.verifyPickupCode('request-1', { code }, donorUser);

      expect(repository.markListingCollectedIfDone).toHaveBeenCalledWith(
        'listing-1',
        expect.anything(),
      );
      expect(logger.log).toHaveBeenCalledWith(
        { listingId: 'listing-1' },
        expect.stringContaining('collected'),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'listing.collected',
          entityType: 'listing',
          entityId: 'listing-1',
        }),
        expect.anything(),
      );
    });

    it('rejects a collectedQuantity greater than what was requested', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(activeRequest);
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
      repository.findById.mockResolvedValue(activeRequest);
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
      repository.findById.mockResolvedValue(activeRequest);
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
        status: 'active',
      });
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode('request-1', { code }, donorUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects verifying a claim that is not accepted', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...activeRequest,
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

      repository.findById.mockResolvedValue(activeRequest);
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
        ...activeRequest,
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

    it('counts a failed attempt and does not complete the claim', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(activeRequest);
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
      repository.findById.mockResolvedValue(activeRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      repository.incrementPickupCodeAttempts.mockResolvedValue(5);
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode('request-1', { code: '000000' }, donorUser),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'request-1',
        'active',
        expect.objectContaining({
          pickupCodeHash: null,
          codeExpiresAt: null,
          codeGeneratedBy: null,
          pickupCodeAttempts: 0,
        }),
      );
    });

    it('409s when the claim stopped being accepted mid-verify', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(activeRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      mockResolveOrgId.mockResolvedValue('org-rescue');
      repository.incrementPickupCodeAttempts.mockResolvedValue(undefined);
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode('request-1', { code: '000000' }, donorUser),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('409s when the claim was modified since it was read on a successful verify', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(activeRequest);
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
        orgId: 'org-rescue',
      };
      repository.findById.mockResolvedValue(activeRequest);
      repository.findListingById.mockResolvedValue(availableListing);
      repository.updateStatus.mockResolvedValue({
        ...activeRequest,
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
