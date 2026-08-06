import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/types/express';
import { DATABASE, type Database } from '../db/db.module';
import {
  isPgError,
  PG_CHECK_VIOLATION,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
} from '../db/pg-errors';
import {
  assertCanCancel,
  assertCanRespond,
  isRequestVisible,
} from './common/request-access.util';
import { assertValidRequestStatusTransition } from './common/request-status.util';
import { CreateRequestDto } from './dto/create-request.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
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
  ) {}

  async create(
    dto: CreateRequestDto,
    user: AuthenticatedUser,
  ): Promise<ListingRequest> {
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
    if (dto.requestedQuantity > Number(listing.remainingQuantity)) {
      throw new BadRequestException(
        `requested quantity exceeds the ${listing.remainingQuantity} ${listing.unit} remaining`,
      );
    }

    try {
      return await this.requestsRepository.create({
        listingId: dto.listingId,
        rescueOrgId: user.orgId!,
        claimedBy: user.userId,
        idempotencyKey: dto.idempotencyKey,
        requestedQuantity: dto.requestedQuantity.toString(),
      });
    } catch (err) {
      if (isPgError(err, PG_UNIQUE_VIOLATION)) {
        // A retried submit with the same key - replay the original result
        // instead of erroring on the double-claim.
        const existing = await this.requestsRepository.findByIdempotencyKey(
          dto.idempotencyKey,
        );
        if (existing) return existing;
      }
      throw err;
    }
  }

  async findAll(
    query: QueryRequestsDto,
    viewer: AuthenticatedUser,
  ): Promise<{ items: ListingRequest[]; total: number }> {
    const [items, total] = await Promise.all([
      this.requestsRepository.findMany(query, viewer),
      this.requestsRepository.countMany(query, viewer),
    ]);
    return { items, total };
  }

  async findOne(
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<ListingRequest> {
    const request = await this.getOrThrow(id);
    const listing = await this.getListingOrThrow(request.listingId);
    if (!isRequestVisible(request, listing, viewer)) {
      throw new NotFoundException(`request ${id} not found`);
    }
    return request;
  }

  async decide(
    id: string,
    dto: UpdateRequestDto,
    user: AuthenticatedUser,
  ): Promise<ListingRequest> {
    const existing = await this.getOrThrow(id);
    const listing = await this.getListingOrThrow(existing.listingId);
    assertValidRequestStatusTransition(existing.status, dto.status);

    if (dto.status === 'cancelled') {
      assertCanCancel(existing, listing, user);
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
        } else if (
          dto.status === 'cancelled' &&
          existing.status === 'accepted'
        ) {
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
            ...(dto.status !== 'cancelled' && {
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
            updatedAt: new Date(),
          },
          tx,
        );

        if (!updated) {
          throw new ConflictException(
            `request ${id} was modified since it was read`,
          );
        }
        return updated;
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
