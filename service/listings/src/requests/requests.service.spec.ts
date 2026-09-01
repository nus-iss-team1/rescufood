import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/types/express';
import type { CreateRequestDto } from './dto/create-request.dto';
import { requestFingerprint } from './idempotency/request-fingerprint.util';
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
    findUserContacts: jest.fn().mockResolvedValue([]),
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

function makeIdempotency() {
  return {
    find: jest.fn().mockResolvedValue(undefined),
    claimSlot: jest.fn().mockResolvedValue({ id: 'slot-1' }),
    complete: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    deleteExpired: jest.fn().mockResolvedValue(0),
  };
}

function makeConfig(values: Record<string, unknown> = {}) {
  return { get: jest.fn((key: string) => values[key]) };
}

function makeService(
  repository: ReturnType<typeof makeRepository>,
  idempotency: ReturnType<typeof makeIdempotency> = makeIdempotency(),
) {
  const db = makeDb();
  const logger = makeLogger();
  const audit = makeAudit();
  const notifications = makeNotifications();
  const config = makeConfig();
  const service = new RequestsService(
    repository as unknown as RequestsRepository,
    idempotency as never,
    audit as never,
    notifications as never,
    db as never,
    logger as never,
    config as never,
  );
  return { service, db, logger, audit, notifications, idempotency };
}

// Fingerprint of the shared `dto` below, so replay-record mocks match.
const FINGERPRINT_DTO = requestFingerprint({
  listingId: 'listing-1',
} as CreateRequestDto);

function completedRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'slot-1',
    rescueOrgId: 'org-rescue',
    idempotencyKey: 'idem-1',
    requestFingerprint: FINGERPRINT_DTO,
    status: 'completed',
    claimId: 'request-1',
    responseSnapshot: null,
    ...overrides,
  };
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
  createdBy: 'user-donor',
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

    it('notifies the donor user after the claim commits', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue({
        ...availableListing,
        description: 'Crate of bananas',
      });
      repository.reserveListingForClaim.mockResolvedValue(reservedListing);
      repository.create.mockResolvedValue(baseRequest);
      repository.findUserContacts.mockResolvedValue([
        {
          id: 'user-donor',
          cognitoSub: 'sub-donor',
          name: 'Priya Nair',
          email: 'donor@x.com',
        },
        {
          id: 'user-rescue',
          cognitoSub: 'sub-rescue',
          name: 'Alex Tan',
          email: 'r@x.com',
        },
      ]);
      repository.findOrgContacts.mockResolvedValue([
        { id: 'org-rescue', name: 'City Harvest', contactEmail: 'r@x.com' },
      ]);
      const { service, notifications } = makeService(repository);

      await service.create(dto, rescueUser);

      expect(repository.findUserContacts).toHaveBeenCalledWith([
        'user-donor',
        'user-rescue',
      ]);
      // AC1: the donor is notified...
      expect(notifications.claimCreated).toHaveBeenCalledWith(
        'donor@x.com',
        expect.objectContaining({
          recipientName: 'Priya Nair',
          listingDescription: 'Crate of bananas',
          rescuePartnerName: 'Alex Tan',
          rescueOrgName: 'City Harvest',
          audience: 'donor',
        }),
        { eventId: 'claim:request-1:created', recipientUserId: 'sub-donor' },
      );
      // ...and so is the claiming rescue organisation.
      expect(notifications.claimCreated).toHaveBeenCalledWith(
        'r@x.com',
        expect.objectContaining({ audience: 'rescue_partner' }),
        { eventId: 'claim:request-1:created', recipientUserId: 'sub-rescue' },
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

    it('pins the claim to the idempotency slot inside the transaction (AC1)', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.reserveListingForClaim.mockResolvedValue(reservedListing);
      repository.create.mockResolvedValue(baseRequest);
      const idempotency = makeIdempotency();
      const { service } = makeService(repository, idempotency);

      await service.create(dto, rescueUser);

      expect(idempotency.claimSlot).toHaveBeenCalledWith(
        expect.objectContaining({
          rescueOrgId: 'org-rescue',
          idempotencyKey: 'idem-1',
          requestFingerprint: FINGERPRINT_DTO,
          expiresAt: expect.any(Date) as Date,
        }),
      );
      expect(idempotency.complete).toHaveBeenCalledWith(
        'slot-1',
        'request-1',
        expect.objectContaining({ id: 'request-1' }),
        expect.any(Date),
        TX_TOKEN,
      );
    });

    it('replays the original outcome for an identical retry (AC2)', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      const idempotency = makeIdempotency();
      idempotency.find.mockResolvedValue(completedRecord());
      const { service } = makeService(repository, idempotency);

      await expect(service.create(dto, rescueUser)).resolves.toEqual(
        baseRequest,
      );
      expect(idempotency.find).toHaveBeenCalledWith('org-rescue', 'idem-1');
      expect(repository.findListingById).not.toHaveBeenCalled();
      expect(repository.reserveListingForClaim).not.toHaveBeenCalled();
      expect(idempotency.claimSlot).not.toHaveBeenCalled();
    });

    it('replays even after the listing has moved on from available (AC2, AC6)', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      const idempotency = makeIdempotency();
      idempotency.find.mockResolvedValue(completedRecord());
      const { service } = makeService(repository, idempotency);

      // No listing lookup happens, so a now-reserved listing can't 400 the retry.
      await expect(service.create(dto, rescueUser)).resolves.toEqual(
        baseRequest,
      );
    });

    it('409s a key reused with a different request and leaves the claim alone (AC3)', async () => {
      const repository = makeRepository();
      const idempotency = makeIdempotency();
      idempotency.find.mockResolvedValue(
        completedRecord({ requestFingerprint: 'a-different-fingerprint' }),
      );
      const { service, audit } = makeService(repository, idempotency);

      await expect(
        service.create({ ...dto, listingId: 'listing-2' }, rescueUser),
      ).rejects.toThrow(/different request/i);
      expect(repository.reserveListingForClaim).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'claim.idempotency_conflict',
          entityId: 'request-1',
        }),
      );
    });

    it('409s a retry received while the original is still in flight (AC5)', async () => {
      const repository = makeRepository();
      const idempotency = makeIdempotency();
      idempotency.find.mockResolvedValue(
        completedRecord({ status: 'pending', claimId: null }),
      );
      const { service } = makeService(repository, idempotency);

      await expect(service.create(dto, rescueUser)).rejects.toThrow(
        /still being processed/i,
      );
      expect(repository.reserveListingForClaim).not.toHaveBeenCalled();
    });

    it('resolves to the original outcome when a concurrent request won the slot (AC4)', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.findById.mockResolvedValue(baseRequest);
      const idempotency = makeIdempotency();
      idempotency.find
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(completedRecord());
      idempotency.claimSlot.mockResolvedValue(undefined);
      const { service } = makeService(repository, idempotency);

      await expect(service.create(dto, rescueUser)).resolves.toEqual(
        baseRequest,
      );
      expect(repository.reserveListingForClaim).not.toHaveBeenCalled();
    });

    it('409s a retry that lost the slot race while the winner is still pending (AC4, AC5)', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      const idempotency = makeIdempotency();
      idempotency.find
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(
          completedRecord({ status: 'pending', claimId: null }),
        );
      idempotency.claimSlot.mockResolvedValue(undefined);
      const { service } = makeService(repository, idempotency);

      await expect(service.create(dto, rescueUser)).rejects.toThrow(
        /still being processed/i,
      );
    });

    it('scopes the idempotency lookup and slot to the caller org (AC7)', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.reserveListingForClaim.mockResolvedValue(reservedListing);
      repository.create.mockResolvedValue(baseRequest);
      const idempotency = makeIdempotency();
      const otherOrgUser = { ...rescueUser, orgId: 'org-other' };
      const { service } = makeService(repository, idempotency);

      await service.create(dto, otherOrgUser);

      expect(idempotency.find).toHaveBeenCalledWith('org-other', 'idem-1');
      expect(idempotency.claimSlot).toHaveBeenCalledWith(
        expect.objectContaining({ rescueOrgId: 'org-other' }),
      );
    });

    it('409s when another org claimed the listing first (reserve returns nothing)', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.reserveListingForClaim.mockResolvedValue(undefined);
      const idempotency = makeIdempotency();
      const { service } = makeService(repository, idempotency);

      await expect(service.create(dto, rescueUser)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(idempotency.release).toHaveBeenCalledWith('slot-1');
    });

    it('does not notify when the claim transaction rolls back (AC5)', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.reserveListingForClaim.mockResolvedValue(undefined);
      const idempotency = makeIdempotency();
      const { service, notifications } = makeService(repository, idempotency);

      await expect(service.create(dto, rescueUser)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(notifications.claimCreated).not.toHaveBeenCalled();
    });

    it('409s when the active-claim unique index rejects a concurrent insert', async () => {
      const repository = makeRepository();
      repository.findListingById.mockResolvedValue(availableListing);
      repository.reserveListingForClaim.mockResolvedValue(reservedListing);
      repository.create.mockRejectedValue({
        code: '23505',
        constraint: 'requests_active_claim_per_listing_uq',
      });
      const idempotency = makeIdempotency();
      const { service } = makeService(repository, idempotency);

      await expect(service.create(dto, rescueUser)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(idempotency.release).toHaveBeenCalledWith('slot-1');
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

    it('notifies the donor user when the rescue partner cancels', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(baseRequest);
      repository.findListingById.mockResolvedValue(reservedListing);
      repository.updateStatus.mockResolvedValue({
        ...baseRequest,
        status: 'cancelled',
      });
      repository.findUserContacts.mockResolvedValue([
        {
          id: 'user-donor',
          cognitoSub: 'sub-donor',
          name: 'Priya Nair',
          email: 'donor@x.com',
        },
        {
          id: 'user-rescue',
          cognitoSub: 'sub-rescue',
          name: 'Alex Tan',
          email: 'r@x.com',
        },
      ]);
      repository.findOrgContacts.mockResolvedValue([
        { id: 'org-rescue', name: 'City Harvest', contactEmail: 'r@x.com' },
      ]);
      const { service, notifications } = makeService(repository);

      await service.decide('request-1', dto, rescueUser);

      expect(repository.findUserContacts).toHaveBeenCalledWith([
        'user-donor',
        'user-rescue',
      ]);
      expect(notifications.claimEnded).toHaveBeenCalledWith(
        'donor@x.com',
        expect.objectContaining({
          recipientName: 'Priya Nair',
          endedBy: 'rescue_partner',
          counterpartyName: 'Alex Tan',
          counterpartyOrgName: 'City Harvest',
        }),
        { eventId: 'claim:request-1:cancelled', recipientUserId: 'sub-donor' },
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
          pickupCode: string;
          pickupCodeHash: string;
          codeGeneratedBy: string;
          pickupCodeAttempts: number;
        },
      ];
      expect(values.pickupCode).toBe(result.code);
      expect(values.pickupCodeHash).toBe(hashPickupCode(result.code));
      expect(values.codeGeneratedBy).toBe(rescueUser.userId);
      expect(values.pickupCodeAttempts).toBe(0);
    });

    it('hands back the current code unchanged while it is still live', async () => {
      const repository = makeRepository();
      const expiresAt = new Date(Date.now() + 30 * 60_000);
      repository.findById.mockResolvedValue({
        ...activeRequest,
        pickupCode: '424242',
        pickupCodeHash: hashPickupCode('424242'),
        codeExpiresAt: expiresAt,
        codeGeneratedBy: 'user-rescue',
      });
      repository.findListingById.mockResolvedValue(availableListing);
      const { service, db, audit } = makeService(repository);

      const result = await service.generatePickupCode('request-1', donorUser);

      expect(result).toEqual({ code: '424242', expiresAt });
      expect(repository.updateStatus).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('mints a fresh code once the current one has expired', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...activeRequest,
        pickupCode: '424242',
        pickupCodeHash: hashPickupCode('424242'),
        codeExpiresAt: new Date(Date.now() - 60_000),
        codeGeneratedBy: 'user-rescue',
      });
      repository.findListingById.mockResolvedValue(availableListing);
      repository.updateStatus.mockResolvedValue(activeRequest);
      const { service } = makeService(repository);

      const result = await service.generatePickupCode('request-1', donorUser);

      expect(result.code).not.toBe('424242');
      expect(repository.updateStatus).toHaveBeenCalled();
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
      repository.findUserContacts.mockResolvedValue([
        {
          id: 'user-donor',
          cognitoSub: 'sub-donor',
          name: 'Priya Nair',
          email: 'donor@x.com',
        },
        {
          id: 'user-rescue',
          cognitoSub: 'sub-rescue',
          name: 'Alex Tan',
          email: 'rescue@x.com',
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
        expect.objectContaining({
          recipientName: 'Priya Nair',
          collectedQuantity: '10 kg',
        }),
        { eventId: 'claim:request-1:completed', recipientUserId: 'sub-donor' },
      );
      expect(notifications.pickupCompleted).toHaveBeenCalledWith(
        'rescue@x.com',
        expect.anything(),
        { eventId: 'claim:request-1:completed', recipientUserId: 'sub-rescue' },
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

    it('replays success when the verifier resubmits the same code on an already-completed claim', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...activeRequest,
        status: 'completed',
        verifiedBy: donorUser.userId,
        collectedQuantity: '10.00',
      });
      repository.findListingById.mockResolvedValue(availableListing);
      const { service, audit, notifications } = makeService(repository);

      const result = await service.verifyPickupCode(
        'request-1',
        { code },
        donorUser,
      );

      expect(result.status).toBe('completed');
      expect(repository.updateStatus).not.toHaveBeenCalled();
      expect(repository.incrementPickupCodeAttempts).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
      expect(notifications.pickupCompleted).not.toHaveBeenCalled();
    });

    it('still rejects a completed claim when a different code is resubmitted', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        ...activeRequest,
        status: 'completed',
        verifiedBy: donorUser.userId,
      });
      repository.findListingById.mockResolvedValue(availableListing);
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode('request-1', { code: '000000' }, donorUser),
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
      repository.incrementPickupCodeAttempts.mockResolvedValue(3);
      const { service } = makeService(repository);

      await expect(
        service.verifyPickupCode('request-1', { code: '000000' }, donorUser),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'request-1',
        'active',
        expect.objectContaining({
          pickupCode: null,
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
