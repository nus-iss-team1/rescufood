import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { resolveOrgIdByUserId } from '../auth/org-membership.guard';
import type { AuthenticatedUser } from '../common/types/express';
import { DATABASE, type Database } from '../db/db.module';
import {
  isPgError,
  PG_CHECK_VIOLATION,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
} from '../db/pg-errors';
import {
  assertCanRespond,
  assertIsParty,
  isRequestVisible,
} from './common/request-access.util';
import {
  PublicListingRequest,
  toPublicRequest,
} from './common/request-response.util';
import { assertValidRequestStatusTransition } from './common/request-status.util';
import { CreateRequestDto } from './dto/create-request.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { VerifyPickupCodeDto } from './dto/verify-pickup-code.dto';
import {
  createPickupCode,
  hashPickupCode,
  MAX_PICKUP_CODE_ATTEMPTS,
  PICKUP_CODE_TTL_MINUTES,
  pickupCodeMatches,
} from './pickup/pickup-code.util';
import {
  ListingRequest,
  RequestedListing,
  RequestsRepository,
} from './requests.repository';

@Injectable()
export class RequestsService {
  constructor(
    private readonly requestsRepository: RequestsRepository,
    @Inject(DATABASE) private readonly db: Database,
    private readonly logger: Logger,
  ) {}

  async create(
    dto: CreateRequestDto,
    user: AuthenticatedUser,
  ): Promise<PublicListingRequest> {
    const listing = await this.requestsRepository.findListingById(
      dto.listingId,
    );
    if (!listing) {
      throw new NotFoundException(`listing ${dto.listingId} not found`);
    }
    if (listing.status !== 'available') {
      throw new BadRequestException(
        `listing ${dto.listingId} is not available for requests`,
      );
    }
    // Guaranteed by OrgMembershipGuard, not client input.
    if (listing.donorOrgId === user.orgId) {
      throw new BadRequestException('you cannot request your own listing');
    }
    // Non-null: guaranteed by the available_listing_is_complete CHECK now
    // that status is confirmed 'available' above.
    if (dto.requestedQuantity > Number(listing.remainingQuantity!)) {
      throw new BadRequestException(
        `requested quantity exceeds the ${listing.remainingQuantity} ${listing.unit} remaining`,
      );
    }

    try {
      const created = await this.requestsRepository.create({
        listingId: dto.listingId,
        rescueOrgId: user.orgId!,
        claimedBy: user.userId,
        idempotencyKey: dto.idempotencyKey,
        requestedQuantity: dto.requestedQuantity.toString(),
      });
      return toPublicRequest(created);
    } catch (err) {
      if (isPgError(err, PG_UNIQUE_VIOLATION)) {
        // A retried submit with the same key - replay the original result
        // instead of erroring on the double-claim.
        const existing = await this.requestsRepository.findByIdempotencyKey(
          dto.idempotencyKey,
        );
        if (existing) return toPublicRequest(existing);
      }
      throw err;
    }
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

  async decide(
    id: string,
    dto: UpdateRequestDto,
    user: AuthenticatedUser,
  ): Promise<PublicListingRequest> {
    const existing = await this.getOrThrow(id);
    const listing = await this.getListingOrThrow(existing.listingId);
    assertValidRequestStatusTransition(existing.status, dto.status);

    const releasesQuantity =
      dto.status === 'cancelled' || dto.status === 'no_show';
    if (releasesQuantity) {
      assertIsParty(existing, listing, user);
    } else {
      assertCanRespond(listing, user);
    }

    try {
      return await this.db.transaction(async (tx) => {
        if (dto.status === 'accepted') {
          const updatedListing =
            await this.requestsRepository.decrementListingQuantity(
              existing.listingId,
              existing.requestedQuantity,
              tx,
            );
          if (!updatedListing) {
            throw new ConflictException(
              `listing ${existing.listingId} is no longer available to accept this request`,
            );
          }
          // This accept just claimed the last of it - nobody else's
          // pending request on this listing can ever be fulfilled now.
          if (updatedListing.status === 'reserved') {
            const supersededCount =
              await this.requestsRepository.supersedeOtherPending(
                existing.listingId,
                id,
                tx,
              );
            if (supersededCount > 0) {
              this.logger.log(
                { listingId: existing.listingId, supersededCount },
                'superseded other pending requests - listing fully reserved',
              );
            }
          }
        } else if (releasesQuantity && existing.status === 'accepted') {
          await this.requestsRepository.incrementListingQuantity(
            existing.listingId,
            existing.requestedQuantity,
            tx,
          );
        }

        const updated = await this.requestsRepository.updateStatus(
          id,
          existing.status,
          {
            status: dto.status,
            ...((dto.status === 'accepted' || dto.status === 'declined') && {
              respondedBy: user.userId,
              respondedAt: new Date(),
            }),
            ...(dto.status === 'declined' && {
              declineReason: dto.declineReason ?? '',
            }),
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
        return toPublicRequest(updated);
      });
    } catch (err) {
      if (isPgError(err, PG_CHECK_VIOLATION)) {
        throw new ConflictException(
          `listing ${existing.listingId} no longer has enough remaining quantity for this request`,
        );
      }
      if (isPgError(err, PG_FOREIGN_KEY_VIOLATION)) {
        throw new NotFoundException(`listing ${existing.listingId} not found`);
      }
      throw err;
    }
  }

  // Either party on an accepted request may (re)generate a pickup code -
  // calling this again immediately invalidates whatever code existed before
  // (new hash overwrites the old one, attempts reset to 0), so a stale QR
  // that failed to scan is never a dead end.
  async generatePickupCode(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ code: string; expiresAt: Date }> {
    const existing = await this.getOrThrow(id);
    const listing = await this.getListingOrThrow(existing.listingId);
    assertIsParty(existing, listing, user);

    if (existing.status !== 'accepted') {
      throw new BadRequestException(
        `cannot generate a pickup code for a request that is ${existing.status}`,
      );
    }

    const code = createPickupCode();
    const expiresAt = new Date(Date.now() + PICKUP_CODE_TTL_MINUTES * 60_000);

    const updated = await this.requestsRepository.updateStatus(id, 'accepted', {
      pickupCodeHash: hashPickupCode(code),
      codeExpiresAt: expiresAt,
      codeGeneratedBy: user.userId,
      pickupCodeAttempts: 0,
      updatedAt: new Date(),
    });
    if (!updated) {
      throw new ConflictException(
        `request ${id} was modified since it was read`,
      );
    }

    return { code, expiresAt };
  }

  // Redeems a code generated by generatePickupCode. A wrong guess and an
  // expired code produce the exact same error - distinguishing them would
  // tell a guesser their timing is the only thing standing between them and
  // a valid-looking code. Five wrong guesses (right or wrong reason) force
  // the code to be regenerated, bounding how much an online guesser can try
  // against the 6-digit space per code.
  async verifyPickupCode(
    id: string,
    dto: VerifyPickupCodeDto,
    user: AuthenticatedUser,
  ): Promise<PublicListingRequest> {
    const existing = await this.getOrThrow(id);
    const listing = await this.getListingOrThrow(existing.listingId);
    assertIsParty(existing, listing, user);

    if (existing.status !== 'accepted') {
      throw new BadRequestException(
        `cannot verify a pickup code for a request that is ${existing.status}`,
      );
    }
    if (!existing.pickupCodeHash) {
      throw new BadRequestException(
        'no pickup code has been generated for this request',
      );
    }
    // Requires the verifier to belong to the *other* org from whoever
    // generated the code - otherwise one org could generate and verify by
    // itself, which defeats the point of a shared handshake.
    if (user.role !== 'admin' && existing.codeGeneratedBy) {
      const generatorOrgId = await resolveOrgIdByUserId(
        this.db,
        existing.codeGeneratedBy,
      );
      if (generatorOrgId && generatorOrgId === user.orgId) {
        throw new ForbiddenException(
          'the organisation that generated the pickup code cannot also verify it',
        );
      }
    }

    const now = new Date();
    const expired = !existing.codeExpiresAt || existing.codeExpiresAt <= now;
    const matches =
      !expired && pickupCodeMatches(dto.code, existing.pickupCodeHash);

    if (!matches) {
      const attempts =
        await this.requestsRepository.incrementPickupCodeAttempts(id, now);
      if (attempts === undefined) {
        throw new ConflictException(`request ${id} is no longer accepted`);
      }
      if (attempts >= MAX_PICKUP_CODE_ATTEMPTS) {
        await this.requestsRepository.updateStatus(id, 'accepted', {
          pickupCodeHash: null,
          codeExpiresAt: null,
          codeGeneratedBy: null,
          pickupCodeAttempts: 0,
          updatedAt: now,
        });
        throw new BadRequestException(
          'too many failed pickup code attempts - generate a new code',
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

    return this.db.transaction(async (tx) => {
      const updated = await this.requestsRepository.updateStatus(
        id,
        'accepted',
        {
          status: 'completed',
          verifiedBy: user.userId,
          collectedAt: now,
          collectedQuantity,
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

      // Was this the last accepted request on the listing still awaiting
      // pickup? If so, the listing itself is now fully collected.
      const collected =
        await this.requestsRepository.markListingCollectedIfDone(
          existing.listingId,
          tx,
        );
      if (collected) {
        this.logger.log(
          { listingId: existing.listingId },
          'listing fully collected - every accepted request has been verified',
        );
      }

      return toPublicRequest(updated);
    });
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
