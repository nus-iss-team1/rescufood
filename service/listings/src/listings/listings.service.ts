import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, type SQL } from 'drizzle-orm';
import type { AuthenticatedUser } from '../common/types/express';
import { DATABASE, type Database } from '../db/db.module';
import { listings } from '../db/schema';
import { CreateListingDto } from './dto/create-listing.dto';
import { QueryListingsDto } from './dto/query-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

// Postgres error codes this service handles explicitly.
// https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_CHECK_VIOLATION = '23514';
const PG_FOREIGN_KEY_VIOLATION = '23503';

@Injectable()
export class ListingsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(dto: CreateListingDto, user: AuthenticatedUser) {
    assertPickupWindowValid(dto.pickupWindowStart, dto.pickupWindowEnd);

    const [created] = await this.db
      .insert(listings)
      .values({
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
      })
      .returning();
    return created;
  }

  async findAll(query: QueryListingsDto) {
    const conditions: SQL[] = [];
    if (query.status) conditions.push(eq(listings.status, query.status));
    if (query.category) conditions.push(eq(listings.category, query.category));
    if (query.pickupLocation)
      conditions.push(eq(listings.pickupLocation, query.pickupLocation));
    if (query.donorOrgId)
      conditions.push(eq(listings.donorOrgId, query.donorOrgId));

    const items = await this.db
      .select()
      .from(listings)
      .where(conditions.length ? and(...conditions) : undefined)
      .limit(query.limit ?? 20)
      .offset(query.offset ?? 0);

    return items;
  }

  async findOne(id: string) {
    const [listing] = await this.db
      .select()
      .from(listings)
      .where(eq(listings.id, id));
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
      const [updated] = await this.db
        .update(listings)
        .set({
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
        })
        .where(and(eq(listings.id, id), eq(listings.version, dto.version)))
        .returning();

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
      await this.db.delete(listings).where(eq(listings.id, id));
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

function isPgError(
  err: unknown,
  code: string,
): err is { code: string; detail?: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    err.code === code
  );
}
