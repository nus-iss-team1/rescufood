import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isPgError,
  PG_CHECK_VIOLATION,
  PG_FOREIGN_KEY_VIOLATION,
} from '../db/pg-errors';
import type { AuthenticatedUser } from '../common/types/express';
import { CreateListingDto } from './dto/create-listing.dto';
import { QueryListingsDto } from './dto/query-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { Listing, ListingsRepository } from './listings.repository';

@Injectable()
export class ListingsService {
  constructor(private readonly listingsRepository: ListingsRepository) {}

  async create(dto: CreateListingDto, user: AuthenticatedUser) {
    assertPickupWindowValid(dto.pickupWindowStart, dto.pickupWindowEnd);

    return this.listingsRepository.create({
      // Guaranteed by OrgMembershipGuard, not client input - a listing
      // is always attributed to the caller's own organisation.
      donorOrgId: user.orgId!,
      createdBy: user.userId,
      category: dto.category,
      description: dto.description,
      remainingQuantity: dto.remainingQuantity.toString(),
      unit: dto.unit,
      allergens: dto.allergens,
      handlingInstructions: dto.handlingInstructions,
      useBy: new Date(dto.useBy),
      pickupLocation: dto.pickupLocation,
      pickupWindowStart: new Date(dto.pickupWindowStart),
      pickupWindowEnd: new Date(dto.pickupWindowEnd),
    });
  }

  findAll(query: QueryListingsDto) {
    return this.listingsRepository.findMany(query);
  }

  async findOne(id: string): Promise<Listing> {
    const listing = await this.listingsRepository.findById(id);
    if (!listing) {
      throw new NotFoundException(`listing ${id} not found`);
    }
    return listing;
  }

  async update(id: string, dto: UpdateListingDto, user: AuthenticatedUser) {
    const existing = await this.findOne(id);
    assertCanModify(existing, user);

    const start =
      dto.pickupWindowStart ?? existing.pickupWindowStart.toISOString();
    const end = dto.pickupWindowEnd ?? existing.pickupWindowEnd.toISOString();
    assertPickupWindowValid(start, end);

    try {
      const updated = await this.listingsRepository.updateWithVersion(
        id,
        dto.version,
        {
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.remainingQuantity !== undefined && {
            remainingQuantity: dto.remainingQuantity.toString(),
          }),
          ...(dto.unit !== undefined && { unit: dto.unit }),
          ...(dto.allergens !== undefined && { allergens: dto.allergens }),
          ...(dto.handlingInstructions !== undefined && {
            handlingInstructions: dto.handlingInstructions,
          }),
          ...(dto.useBy !== undefined && { useBy: new Date(dto.useBy) }),
          ...(dto.pickupLocation !== undefined && {
            pickupLocation: dto.pickupLocation,
          }),
          ...(dto.pickupWindowStart !== undefined && {
            pickupWindowStart: new Date(dto.pickupWindowStart),
          }),
          ...(dto.pickupWindowEnd !== undefined && {
            pickupWindowEnd: new Date(dto.pickupWindowEnd),
          }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.cancelledReason !== undefined && {
            cancelledReason: dto.cancelledReason,
          }),
          version: existing.version + 1,
          updatedAt: new Date(),
        },
      );

      if (!updated) {
        throw new ConflictException(
          `listing ${id} was modified since version ${dto.version} was read`,
        );
      }
      return updated;
    } catch (err) {
      if (isPgError(err, PG_CHECK_VIOLATION)) {
        throw new BadRequestException(
          err.detail ?? 'listing violates a data constraint',
        );
      }
      throw err;
    }
  }

  async remove(id: string, user: AuthenticatedUser) {
    const existing = await this.findOne(id);
    assertCanModify(existing, user);

    try {
      await this.listingsRepository.delete(id);
    } catch (err) {
      if (isPgError(err, PG_FOREIGN_KEY_VIOLATION)) {
        throw new ConflictException(
          `listing ${id} has associated requests or images and cannot be deleted`,
        );
      }
      throw err;
    }
  }
}

function assertCanModify(
  listing: { createdBy: string },
  user: AuthenticatedUser,
): void {
  if (user.role !== 'admin' && listing.createdBy !== user.userId) {
    throw new ForbiddenException('you do not have access to this listing');
  }
}

function assertPickupWindowValid(start: string, end: string): void {
  if (new Date(end).getTime() <= new Date(start).getTime()) {
    throw new BadRequestException(
      'pickupWindowEnd must be after pickupWindowStart',
    );
  }
}
