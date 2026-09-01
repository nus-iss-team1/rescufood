import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AuditAction } from '../audit/audit.actions';
import { AuditRepository } from '../audit/audit.repository';
import type { AuthenticatedUser } from '../common/types/express';
import { DATABASE, type Database } from '../db/db.module';
import {
  isPgError,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
} from '../db/pg-errors';
import {
  assertIsClaimingPartner,
  assertIsDonor,
  assertIsParty,
  isRequestVisible,
} from './common/request-access.util';
import {
  PublicListingRequest,
  toPublicRequest,
} from './common/request-response.util';
import { formatWindow } from './common/pickup-window.util';
import { assertValidRequestStatusTransition } from './common/request-status.util';
import {
  IdempotencyConflictException,
  IdempotencyProcessingException,
} from './idempotency/idempotency.exceptions';
import {
  IdempotencyRepository,
  STALE_PENDING_MS,
  type IdempotencyRecord,
} from './idempotency/idempotency.repository';
import { requestFingerprint } from './idempotency/request-fingerprint.util';
import { NotificationsPublisher } from '../notifications/notifications.publisher';
import { CreateRequestDto } from './dto/create-request.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { VerifyPickupCodeDto } from './dto/verify-pickup-code.dto';
import {
  createPickupCode,
  hashPickupCode,
  MAX_PICKUP_CODE_ATTEMPTS,
  PICKUP_CODE_REGEN_COOLDOWN_SECONDS,
  PICKUP_CODE_TTL_MINUTES,
  pickupCodeMatches,
} from './pickup/pickup-code.util';
import {
  ListingRequest,
  RequestedListing,
  RequestsRepository,
} from './requests.repository';

const ACTIVE_CLAIM_CONSTRAINT = 'requests_active_claim_per_listing_uq';
const DEFAULT_RETENTION_DAYS = 7;

// Earliest a replacement pickup code may be minted, given when the current
// one was. Falls back to "now" when nothing was ever generated.
function regenAvailableAt(generatedAt: Date | null): Date {
  const from = generatedAt?.getTime() ?? Date.now();
  return new Date(from + PICKUP_CODE_REGEN_COOLDOWN_SECONDS * 1000);
}

@Injectable()
export class RequestsService {
  private readonly retentionMs: number;

  constructor(
    private readonly requestsRepository: RequestsRepository,
    private readonly idempotency: IdempotencyRepository,
    private readonly auditRepository: AuditRepository,
    private readonly notifications: NotificationsPublisher,
    @Inject(DATABASE) private readonly db: Database,
    private readonly logger: Logger,
    config: ConfigService,
  ) {
    const days =
      config.get<number>('IDEMPOTENCY_RETENTION_DAYS') ??
      DEFAULT_RETENTION_DAYS;
    this.retentionMs = days * 24 * 60 * 60 * 1000;
  }

  // First-come-first-served: claim the whole listing and reserve it for the
  // caller's org in one transaction. Idempotent per rescue org on
  // idempotencyKey - an identical retry replays the original claim, a reused
  // key with different data is a 409 conflict, a retry mid-flight is a 409
  // asking the caller to try again, and a losing race gets a 409.
  async create(
    dto: CreateRequestDto,
    user: AuthenticatedUser,
  ): Promise<PublicListingRequest> {
    const fingerprint = requestFingerprint(dto);

    // Replay first: an identical retry must return the original outcome even
    // after the listing has moved on from 'available'.
    const prior = await this.idempotency.find(user.orgId!, dto.idempotencyKey);
    if (prior) return this.replayIdempotent(prior, fingerprint, user);

    const listing = await this.requestsRepository.findListingById(
      dto.listingId,
    );
    if (!listing) {
      throw new NotFoundException(`listing ${dto.listingId} not found`);
    }
    if (listing.status !== 'available') {
      throw new BadRequestException(
        `listing ${dto.listingId} is not available to claim`,
      );
    }
    if (
      listing.pickupWindowEnd &&
      listing.pickupWindowEnd.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        `listing ${dto.listingId} can no longer be claimed - its pickup window has closed`,
      );
    }
    const eligibility = await this.requestsRepository.findClaimantContext(
      user.userId,
    );
    if (!eligibility || eligibility.userStatus !== 'active') {
      throw new ForbiddenException('your account is not active');
    }
    if (eligibility.orgType !== 'rescue_partner') {
      throw new ForbiddenException(
        'only rescue-partner organisations can claim listings',
      );
    }
    if (eligibility.orgStatus !== 'approved') {
      throw new ForbiddenException(
        'your organisation is not approved to claim listings',
      );
    }

    const slot = await this.idempotency.claimSlot({
      rescueOrgId: user.orgId!,
      idempotencyKey: dto.idempotencyKey,
      requestFingerprint: fingerprint,
      expiresAt: new Date(Date.now() + STALE_PENDING_MS),
    });
    if (!slot) {
      // Lost the slot race between the lookup above and here - re-read and
      // resolve to whatever the winner is doing.
      const raced = await this.idempotency.find(
        user.orgId!,
        dto.idempotencyKey,
      );
      if (raced) return this.replayIdempotent(raced, fingerprint, user);
      throw new IdempotencyProcessingException();
    }

    try {
      const created = await this.db.transaction(async (tx) => {
        const reserved = await this.requestsRepository.reserveListingForClaim(
          dto.listingId,
          tx,
        );
        if (!reserved) {
          throw new ConflictException(
            `listing ${dto.listingId} is no longer available to claim`,
          );
        }
        const claim = await this.requestsRepository.create(
          {
            listingId: dto.listingId,
            rescueOrgId: user.orgId!,
            claimedBy: user.userId,
            status: 'active',
            requestedQuantity: reserved.quantity!,
          },
          tx,
        );
        await this.auditRepository.record(
          {
            actor: { userId: user.userId, orgId: user.orgId ?? null },
            action: AuditAction.ClaimCreated,
            entityType: 'claim',
            entityId: claim.id,
            metadata: {
              listingId: dto.listingId,
              donorOrgId: reserved.donorOrgId,
            },
          },
          tx,
        );
        await this.idempotency.complete(
          slot.id,
          claim.id,
          toPublicRequest(claim),
          new Date(Date.now() + this.retentionMs),
          tx,
        );
        return claim;
      });
      await this.notifyClaimCreated(created.id, listing, user);
      return toPublicRequest(created);
    } catch (err) {
      // The claim never committed - free the slot so a genuine retry isn't
      // stuck replaying a failure that may no longer apply.
      await this.idempotency.release(slot.id).catch((releaseErr: unknown) => {
        this.logger.error(
          { err: releaseErr, slotId: slot.id },
          'failed to release idempotency slot after a failed claim',
        );
      });
      if (err instanceof ConflictException) throw err;
      if (
        isPgError(err, PG_UNIQUE_VIOLATION) &&
        err.constraint === ACTIVE_CLAIM_CONSTRAINT
      ) {
        throw new ConflictException(
          `listing ${dto.listingId} has already been claimed`,
        );
      }
      throw err;
    }
  }

  // Resolves a reused idempotency key: replays the original claim for an
  // identical retry, 409s a key reused with different data, and 409s (retry
  // later) while the original is still in flight.
  private async replayIdempotent(
    record: IdempotencyRecord,
    fingerprint: string,
    user: AuthenticatedUser,
  ): Promise<PublicListingRequest> {
    if (record.requestFingerprint !== fingerprint) {
      if (record.claimId) {
        await this.auditRepository.record({
          actor: { userId: user.userId, orgId: user.orgId ?? null },
          action: AuditAction.ClaimIdempotencyConflict,
          entityType: 'claim',
          entityId: record.claimId,
        });
      }
      throw new IdempotencyConflictException();
    }
    if (record.status !== 'completed' || !record.claimId) {
      throw new IdempotencyProcessingException();
    }
    const claim = await this.requestsRepository.findById(record.claimId);
    if (!claim) {
      throw new Error(
        `idempotency record ${record.id} references missing claim ${record.claimId}`,
      );
    }
    return toPublicRequest(claim);
  }

  async findAll(
    query: QueryRequestsDto,
    viewer: AuthenticatedUser,
  ): Promise<{ items: PublicListingRequest[]; total: number }> {
    const [items, total] = await Promise.all([
      this.requestsRepository.findMany(query, viewer),
      this.requestsRepository.countMany(query, viewer),
    ]);
    return { items: items.map(toPublicRequest), total };
  }

  async findOne(
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<PublicListingRequest> {
    const request = await this.getOrThrow(id);
    const listing = await this.getListingOrThrow(request.listingId);
    if (!isRequestVisible(request, listing, viewer)) {
      throw new NotFoundException(`request ${id} not found`);
    }
    return toPublicRequest(request);
  }

  // Either party to an active claim may cancel it or report a no-show; both
  // reopen the listing for another org.
  async decide(
    id: string,
    dto: UpdateRequestDto,
    user: AuthenticatedUser,
  ): Promise<PublicListingRequest> {
    const existing = await this.getOrThrow(id);
    const listing = await this.getListingOrThrow(existing.listingId);
    assertValidRequestStatusTransition(existing.status, dto.status);
    assertIsParty(existing, listing, user);

    try {
      const result = await this.db.transaction(async (tx) => {
        if (existing.status === 'active') {
          await this.requestsRepository.reopenListingAfterClaimEnded(
            existing.listingId,
            tx,
          );
        }

        const updated = await this.requestsRepository.updateStatus(
          id,
          existing.status,
          {
            status: dto.status,
            ...(dto.status === 'cancelled' && {
              cancelledAt: new Date(),
              cancellationReason: dto.cancellationReason ?? '',
            }),
            ...(dto.status === 'no_show' && {
              noShowReason: dto.noShowReason ?? '',
            }),
            updatedAt: new Date(),
          },
          tx,
        );

        if (!updated) {
          throw new ConflictException(
            `request ${id} was modified since it was read`,
          );
        }

        await this.auditRepository.record(
          {
            actor: { userId: user.userId, orgId: user.orgId ?? null },
            action:
              dto.status === 'no_show'
                ? AuditAction.ClaimNoShow
                : AuditAction.ClaimCancelled,
            entityType: 'claim',
            entityId: id,
            reason:
              dto.status === 'no_show'
                ? (dto.noShowReason ?? '')
                : (dto.cancellationReason ?? ''),
            metadata: {
              previousStatus: existing.status,
              listingId: existing.listingId,
              listingReopened: existing.status === 'active',
            },
          },
          tx,
        );

        return toPublicRequest(updated);
      });
      await this.notifyClaimEnded(existing, listing, dto, user);
      return result;
    } catch (err) {
      if (isPgError(err, PG_FOREIGN_KEY_VIOLATION)) {
        throw new NotFoundException(`listing ${existing.listingId} not found`);
      }
      throw err;
    }
  }

  // The claiming rescue partner asks for the pickup code. By default a live
  // (unexpired) code is handed back unchanged so a reload or a second device
  // can show it without invalidating what the donor may be about to enter;
  // `regenerate` forces a fresh one. Minting a replacement is rate-limited to
  // one per PICKUP_CODE_REGEN_COOLDOWN_SECONDS. The code also expires after
  // PICKUP_CODE_TTL_MINUTES or once MAX_PICKUP_CODE_ATTEMPTS verifies fail.
  async generatePickupCode(
    id: string,
    user: AuthenticatedUser,
    regenerate = false,
  ): Promise<{ code: string; expiresAt: Date; regenerateAvailableAt: Date }> {
    const existing = await this.getOrThrow(id);
    await this.getListingOrThrow(existing.listingId);
    assertIsClaimingPartner(existing, user);

    if (existing.status !== 'active') {
      throw new BadRequestException(
        `cannot generate a pickup code for a claim that is ${existing.status}`,
      );
    }

    if (
      !regenerate &&
      existing.pickupCode &&
      existing.codeExpiresAt &&
      existing.codeExpiresAt.getTime() > Date.now()
    ) {
      return {
        code: existing.pickupCode,
        expiresAt: existing.codeExpiresAt,
        regenerateAvailableAt: regenAvailableAt(existing.pickupCodeGeneratedAt),
      };
    }

    // Minting a replacement - not too soon after the last one.
    if (existing.pickupCodeGeneratedAt) {
      const waitSeconds = Math.ceil(
        (regenAvailableAt(existing.pickupCodeGeneratedAt).getTime() -
          Date.now()) /
          1000,
      );
      if (waitSeconds > 0) {
        throw new HttpException(
          `please wait ${waitSeconds}s before generating a new code`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const code = createPickupCode();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + PICKUP_CODE_TTL_MINUTES * 60_000,
    );

    await this.db.transaction(async (tx) => {
      const updated = await this.requestsRepository.updateStatus(
        id,
        'active',
        {
          pickupCode: code,
          pickupCodeHash: hashPickupCode(code),
          codeExpiresAt: expiresAt,
          codeGeneratedBy: user.userId,
          pickupCodeGeneratedAt: now,
          pickupCodeAttempts: 0,
          updatedAt: now,
        },
        tx,
      );
      if (!updated) {
        throw new ConflictException(
          `request ${id} was modified since it was read`,
        );
      }
      await this.auditRepository.record(
        {
          actor: { userId: user.userId, orgId: user.orgId ?? null },
          action: AuditAction.PickupCodeGenerated,
          entityType: 'claim',
          entityId: id,
        },
        tx,
      );
    });

    return { code, expiresAt, regenerateAvailableAt: regenAvailableAt(now) };
  }

  // Redeems a pickup code. A wrong guess and an expired code give the same
  // error so timing leaks nothing. MAX_PICKUP_CODE_ATTEMPTS wrong guesses
  // void the code - the rescue partner then generates a new one, bounding
  // online guessing of the 6-digit space.
  async verifyPickupCode(
    id: string,
    dto: VerifyPickupCodeDto,
    user: AuthenticatedUser,
  ): Promise<PublicListingRequest> {
    const existing = await this.getOrThrow(id);
    const listing = await this.getListingOrThrow(existing.listingId);
    assertIsDonor(listing, user);

    if (existing.status !== 'active') {
      // Idempotent replay: the donor who already verified this claim
      // resubmits the same code (a lost response, a double-tap) and should
      // see success, not an error.
      if (
        existing.status === 'completed' &&
        existing.verifiedBy === user.userId &&
        existing.pickupCodeHash &&
        pickupCodeMatches(dto.code, existing.pickupCodeHash)
      ) {
        return toPublicRequest(existing);
      }
      throw new BadRequestException(
        `cannot verify a pickup code for a claim that is ${existing.status}`,
      );
    }
    if (!existing.pickupCodeHash) {
      throw new BadRequestException(
        existing.pickupCodeAttempts >= MAX_PICKUP_CODE_ATTEMPTS
          ? 'that code is no longer valid after too many attempts - ask the rescue partner for a new one'
          : 'no pickup code has been generated for this claim',
      );
    }

    const now = new Date();
    const expired = !existing.codeExpiresAt || existing.codeExpiresAt <= now;
    const matches =
      !expired && pickupCodeMatches(dto.code, existing.pickupCodeHash);

    if (!matches) {
      const attempts =
        await this.requestsRepository.incrementPickupCodeAttempts(id, now);
      if (attempts === undefined) {
        throw new ConflictException(`request ${id} is no longer active`);
      }
      if (attempts >= MAX_PICKUP_CODE_ATTEMPTS) {
        // Void the code; the attempt count is left at the cap so verify can
        // still say why, and pickupCodeGeneratedAt still gates regeneration.
        const voided = await this.requestsRepository.updateStatus(
          id,
          'active',
          {
            pickupCode: null,
            pickupCodeHash: null,
            codeExpiresAt: null,
            codeGeneratedBy: null,
            updatedAt: now,
          },
        );
        if (voided) {
          await this.auditRepository.record({
            actor: { userId: user.userId, orgId: user.orgId ?? null },
            action: AuditAction.PickupCodeExhausted,
            entityType: 'claim',
            entityId: id,
          });
        }
        throw new BadRequestException(
          'too many incorrect attempts - this code is no longer valid. Ask the rescue partner for a new one',
        );
      }
      throw new BadRequestException('invalid pickup code');
    }

    const collectedQuantity = (
      dto.collectedQuantity ?? Number(existing.requestedQuantity)
    ).toString();
    if (Number(collectedQuantity) > Number(existing.requestedQuantity)) {
      throw new BadRequestException(
        `collected quantity cannot exceed the requested ${existing.requestedQuantity}`,
      );
    }

    const result = await this.db.transaction(async (tx) => {
      const updated = await this.requestsRepository.updateStatus(
        id,
        'active',
        {
          status: 'completed',
          verifiedBy: user.userId,
          collectedAt: now,
          collectedQuantity,
          pickupCode: null,
          pickupCodeAttempts: 0,
          updatedAt: now,
        },
        tx,
      );
      if (!updated) {
        throw new ConflictException(
          `request ${id} was modified since it was read`,
        );
      }

      const collected =
        await this.requestsRepository.markListingCollectedIfDone(
          existing.listingId,
          tx,
        );

      const actor = { userId: user.userId, orgId: user.orgId ?? null };
      await this.auditRepository.record(
        {
          actor,
          action: AuditAction.ClaimCompleted,
          entityType: 'claim',
          entityId: id,
          metadata: { collectedQuantity, listingId: existing.listingId },
        },
        tx,
      );
      if (collected) {
        await this.auditRepository.record(
          {
            actor,
            action: AuditAction.ListingCollected,
            entityType: 'listing',
            entityId: existing.listingId,
          },
          tx,
        );
        this.logger.log(
          { listingId: existing.listingId },
          'listing collected - claim verified at pickup',
        );
      }

      return toPublicRequest(updated);
    });

    await this.notifyPickupCompleted(existing, listing, collectedQuantity);
    return result;
  }

  // Notifications below are best-effort: run after commit, failures logged.

  private async notifyClaimCreated(
    claimId: string,
    listing: RequestedListing,
    claimant: AuthenticatedUser,
  ): Promise<void> {
    try {
      const [contacts, orgs] = await Promise.all([
        this.requestsRepository.findUserContacts([
          listing.createdBy,
          claimant.userId,
        ]),
        this.requestsRepository.findOrgContacts([claimant.orgId ?? '']),
      ]);
      const donor = contacts.find((c) => c.id === listing.createdBy);
      const partner = contacts.find((c) => c.id === claimant.userId);
      const rescueOrg = orgs.find((o) => o.id === claimant.orgId);
      const eventId = `claim:${claimId}:created`;
      const base = {
        listingDescription: listing.description,
        rescuePartnerName: partner?.name ?? null,
        rescueOrgName: rescueOrg?.name ?? 'A rescue partner',
        pickupLocation: listing.pickupLocation,
        pickupWindow: formatWindow(
          listing.pickupWindowStart,
          listing.pickupWindowEnd,
        ),
      };
      // AC1: notify both the donor and the claiming rescue organisation.
      if (donor) {
        await this.notifications.claimCreated(
          donor.email,
          { ...base, recipientName: donor.name, audience: 'donor' },
          { eventId, recipientUserId: donor.cognitoSub },
        );
      }
      if (partner) {
        await this.notifications.claimCreated(
          partner.email,
          { ...base, recipientName: partner.name, audience: 'rescue_partner' },
          { eventId, recipientUserId: partner.cognitoSub },
        );
      }
    } catch (err) {
      this.logger.error({ err }, 'claim_created notification failed');
    }
  }

  private async notifyClaimEnded(
    claim: ListingRequest,
    listing: RequestedListing,
    dto: UpdateRequestDto,
    actor: AuthenticatedUser,
  ): Promise<void> {
    try {
      const actorIsDonor = actor.orgId === listing.donorOrgId;
      const recipientUserId = actorIsDonor
        ? claim.claimedBy
        : listing.createdBy;
      const counterpartyOrgId = actorIsDonor
        ? listing.donorOrgId
        : claim.rescueOrgId;
      const [contacts, orgs] = await Promise.all([
        this.requestsRepository.findUserContacts([
          recipientUserId,
          actor.userId,
        ]),
        this.requestsRepository.findOrgContacts([counterpartyOrgId]),
      ]);
      const recipient = contacts.find((c) => c.id === recipientUserId);
      if (!recipient) return;
      const counterparty = contacts.find((c) => c.id === actor.userId);
      const counterpartyOrg = orgs.find((o) => o.id === counterpartyOrgId);
      const suffix = dto.status === 'no_show' ? 'no-show' : 'cancelled';
      await this.notifications.claimEnded(
        recipient.email,
        {
          recipientName: recipient.name,
          listingDescription: listing.description,
          endedBy:
            dto.status === 'no_show'
              ? 'no_show'
              : actorIsDonor
                ? 'donor'
                : 'rescue_partner',
          counterpartyName: counterparty?.name ?? null,
          counterpartyOrgName: counterpartyOrg?.name ?? null,
          reason:
            dto.status === 'no_show'
              ? dto.noShowReason
              : dto.cancellationReason,
        },
        {
          eventId: `claim:${claim.id}:${suffix}`,
          recipientUserId: recipient.cognitoSub,
        },
      );
    } catch (err) {
      this.logger.error({ err }, 'claim_cancelled notification failed');
    }
  }

  private async notifyPickupCompleted(
    claim: ListingRequest,
    listing: RequestedListing,
    collectedQuantity: string,
  ): Promise<void> {
    try {
      const contacts = await this.requestsRepository.findUserContacts([
        listing.createdBy,
        claim.claimedBy,
      ]);
      const qty =
        listing.unit != null
          ? `${collectedQuantity} ${listing.unit}`
          : undefined;
      await Promise.all(
        contacts.map((c) =>
          this.notifications.pickupCompleted(
            c.email,
            {
              recipientName: c.name,
              listingDescription: listing.description,
              collectedQuantity: qty,
            },
            {
              eventId: `claim:${claim.id}:completed`,
              recipientUserId: c.cognitoSub,
            },
          ),
        ),
      );
    } catch (err) {
      this.logger.error({ err }, 'pickup_completed notification failed');
    }
  }

  private async getOrThrow(id: string): Promise<ListingRequest> {
    const request = await this.requestsRepository.findById(id);
    if (!request) {
      throw new NotFoundException(`request ${id} not found`);
    }
    return request;
  }

  private async getListingOrThrow(id: string): Promise<RequestedListing> {
    const listing = await this.requestsRepository.findListingById(id);
    if (!listing) {
      throw new NotFoundException(`listing ${id} not found`);
    }
    return listing;
  }
}
