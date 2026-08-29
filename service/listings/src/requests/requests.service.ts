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
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
} from '../db/pg-errors';
import { assertIsParty, isRequestVisible } from './common/request-access.util';
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

const IDEMPOTENCY_KEY_CONSTRAINT = 'requests_rescue_org_idempotency_key_uq';
const ACTIVE_CLAIM_CONSTRAINT = 'requests_active_claim_per_listing_uq';

@Injectable()
export class RequestsService {
  constructor(
    private readonly requestsRepository: RequestsRepository,
    @Inject(DATABASE) private readonly db: Database,
    private readonly logger: Logger,
  ) {}

  // First-come-first-served: claim the whole listing and reserve it for the
  // caller's org in one transaction. Idempotent on (rescueOrgId,
  // idempotencyKey) - a retry replays the original claim; a losing race gets
  // a 409.
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

    const replay = await this.requestsRepository.findByIdempotencyKey(
      user.orgId!,
      dto.idempotencyKey,
    );
    if (replay) return toPublicRequest(replay);

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
        return this.requestsRepository.create(
          {
            listingId: dto.listingId,
            rescueOrgId: user.orgId!,
            claimedBy: user.userId,
            idempotencyKey: dto.idempotencyKey,
            status: 'active',
            requestedQuantity: reserved.quantity!,
          },
          tx,
        );
      });
      return toPublicRequest(created);
    } catch (err) {
      // A retry landing just after the original committed replays it rather
      // than erroring on the lost race.
      if (err instanceof ConflictException) {
        const raced = await this.requestsRepository.findByIdempotencyKey(
          user.orgId!,
          dto.idempotencyKey,
        );
        if (raced) return toPublicRequest(raced);
        throw err;
      }
      if (isPgError(err, PG_UNIQUE_VIOLATION)) {
        if (err.constraint === IDEMPOTENCY_KEY_CONSTRAINT) {
          const existing = await this.requestsRepository.findByIdempotencyKey(
            user.orgId!,
            dto.idempotencyKey,
          );
          if (existing) return toPublicRequest(existing);
        }
        if (err.constraint === ACTIVE_CLAIM_CONSTRAINT) {
          throw new ConflictException(
            `listing ${dto.listingId} has already been claimed`,
          );
        }
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
      return await this.db.transaction(async (tx) => {
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
        return toPublicRequest(updated);
      });
    } catch (err) {
      if (isPgError(err, PG_FOREIGN_KEY_VIOLATION)) {
        throw new NotFoundException(`listing ${existing.listingId} not found`);
      }
      throw err;
    }
  }

  // Either party may (re)generate the pickup code; regenerating invalidates
  // the previous one.
  async generatePickupCode(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ code: string; expiresAt: Date }> {
    const existing = await this.getOrThrow(id);
    const listing = await this.getListingOrThrow(existing.listingId);
    assertIsParty(existing, listing, user);

    if (existing.status !== 'active') {
      throw new BadRequestException(
        `cannot generate a pickup code for a claim that is ${existing.status}`,
      );
    }

    const code = createPickupCode();
    const expiresAt = new Date(Date.now() + PICKUP_CODE_TTL_MINUTES * 60_000);

    const updated = await this.requestsRepository.updateStatus(id, 'active', {
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

  // Redeems a pickup code. A wrong guess and an expired code give the same
  // error so timing leaks nothing. MAX_PICKUP_CODE_ATTEMPTS wrong guesses
  // force a new code, bounding online guessing of the 6-digit space.
  async verifyPickupCode(
    id: string,
    dto: VerifyPickupCodeDto,
    user: AuthenticatedUser,
  ): Promise<PublicListingRequest> {
    const existing = await this.getOrThrow(id);
    const listing = await this.getListingOrThrow(existing.listingId);
    assertIsParty(existing, listing, user);

    if (existing.status !== 'active') {
      throw new BadRequestException(
        `cannot verify a pickup code for a claim that is ${existing.status}`,
      );
    }
    if (!existing.pickupCodeHash) {
      throw new BadRequestException(
        'no pickup code has been generated for this claim',
      );
    }
    // The verifier must be from the other org - otherwise one org could
    // generate and verify by itself.
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
        throw new ConflictException(`request ${id} is no longer active`);
      }
      if (attempts >= MAX_PICKUP_CODE_ATTEMPTS) {
        await this.requestsRepository.updateStatus(id, 'active', {
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
        'active',
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

      const collected =
        await this.requestsRepository.markListingCollectedIfDone(
          existing.listingId,
          tx,
        );
      if (collected) {
        this.logger.log(
          { listingId: existing.listingId },
          'listing collected - claim verified at pickup',
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
