import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import type { AuthenticatedUser } from '../common/types/express';
import { DATABASE, type Database } from '../db/db.module';
import {
  isPgError,
  PG_CHECK_VIOLATION,
  PG_FOREIGN_KEY_VIOLATION,
} from '../db/pg-errors';
import { S3Service } from '../storage/s3.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { QueryListingsDto } from './dto/query-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import {
  assertCanModify,
  isListingVisible,
} from './common/listing-access.util';
import { assertValidStatusTransition } from './common/listing-status.util';
import {
  ListingImageResponse,
  toListingImageResponses,
} from './images/listing-image-response.util';
import { ListingImageUploadService } from './images/listing-image-upload.service';
import { ListingImagesRepository } from './images/listing-images.repository';
import { Listing, ListingsRepository } from './listings.repository';

export type ListingWithImages = Listing & { images: ListingImageResponse[] };

@Injectable()
export class ListingsService {
  constructor(
    private readonly listingsRepository: ListingsRepository,
    private readonly listingImagesRepository: ListingImagesRepository,
    private readonly listingImageUploadService: ListingImageUploadService,
    private readonly s3: S3Service,
    private readonly logger: Logger,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async create(
    dto: CreateListingDto,
    files: Express.Multer.File[],
    user: AuthenticatedUser,
  ): Promise<ListingWithImages> {
    assertPickupWindowValid(dto.pickupWindowStart, dto.pickupWindowEnd);

    const created = await this.listingsRepository.create({
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

    if (files.length === 0) {
      return { ...created, images: [] };
    }

    try {
      const images = await this.listingImageUploadService.uploadImages(
        created.id,
        files,
      );
      return { ...created, images };
    } catch (err) {
      // Make creation look atomic to the caller: if the images attached in
      // the same request can't be saved, don't leave an image-less listing
      // behind for them to notice and clean up later.
      await this.listingsRepository
        .delete(created.id, created.version + 1)
        .catch((cleanupErr: unknown) => {
          this.logger.warn(
            { listingId: created.id, err: cleanupErr },
            'failed to roll back listing after image upload failure during create',
          );
        });
      throw err;
    }
  }

  async findAll(
    query: QueryListingsDto,
    viewer: AuthenticatedUser,
  ): Promise<{ items: ListingWithImages[]; total: number }> {
    const [listings, total] = await Promise.all([
      this.listingsRepository.findMany(query, viewer),
      this.listingsRepository.countMany(query, viewer),
    ]);
    return { items: await this.attachImagesToMany(listings), total };
  }

  async findOne(
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<ListingWithImages> {
    const listing = await this.getOrThrow(id);
    // Same rule findMany applies via SQL, checked here in-memory since this
    // path already has the row - a draft outside the viewer's org 404s
    // rather than 403ing, so its existence isn't confirmed to outsiders.
    if (!isListingVisible(listing, viewer)) {
      throw new NotFoundException(`listing ${id} not found`);
    }
    return this.attachImages(listing);
  }

  // Raw fetch (no image lookup/signing) for internal callers that only need
  // the listing row itself - e.g. the ownership check before update/remove.
  async getOrThrow(id: string): Promise<Listing> {
    const listing = await this.listingsRepository.findById(id);
    if (!listing) {
      throw new NotFoundException(`listing ${id} not found`);
    }
    return listing;
  }

  async update(
    id: string,
    dto: UpdateListingDto,
    files: Express.Multer.File[],
    user: AuthenticatedUser,
  ): Promise<ListingWithImages> {
    const existing = await this.getOrThrow(id);
    assertCanModify(existing, user);

    if (dto.status !== undefined) {
      assertValidStatusTransition(existing.status, dto.status);
    }

    const start =
      dto.pickupWindowStart ?? existing.pickupWindowStart.toISOString();
    const end = dto.pickupWindowEnd ?? existing.pickupWindowEnd.toISOString();
    assertPickupWindowValid(start, end);

    const deleteImageIds = dto.deleteImageIds ?? [];
    // Fails fast on an unknown/foreign id before touching S3 or the DB.
    await this.listingImageUploadService.assertImagesBelongToListing(
      id,
      deleteImageIds,
    );

    // S3 upload has to happen outside the DB transaction below - never hold
    // a transaction open across a network call. The per-listing image cap
    // is checked against the count *after* the deletions above (already
    // validated, not yet applied), so a swap (delete one, add one) at the
    // cap doesn't get rejected.
    let s3Keys: string[] = [];
    if (files.length > 0) {
      const currentCount =
        await this.listingImagesRepository.countByListingId(id);
      s3Keys = await this.listingImageUploadService.uploadToS3(
        id,
        files,
        currentCount - deleteImageIds.length,
      );
    }

    try {
      // Deletions, new-image inserts and the field update all land in one
      // transaction: if the version check (or anything else here) fails,
      // everything rolls back together - no more "images changed but the
      // field edit didn't" split outcome.
      const { updated, deletedImages } = await this.db.transaction(
        async (tx) => {
          const deletedImages =
            deleteImageIds.length > 0
              ? await this.listingImagesRepository.deleteMany(
                  id,
                  deleteImageIds,
                  tx,
                )
              : [];

          if (s3Keys.length > 0) {
            await this.listingImagesRepository.insertMany(id, s3Keys, tx);
          }

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
              ...(dto.allergens !== undefined && {
                allergens: dto.allergens,
              }),
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
            tx,
          );

          if (!updated) {
            throw new ConflictException(
              `listing ${id} was modified since version ${dto.version} was read`,
            );
          }
          return { updated, deletedImages };
        },
      );

      // Only safe to remove the old objects from S3 once the transaction
      // that dropped their DB rows has actually committed.
      await this.listingImageUploadService.deleteS3Objects(deletedImages);
      return this.attachImages(updated);
    } catch (err) {
      // Transaction didn't commit - clean up anything uploaded to S3 for
      // this request so it doesn't orphan.
      if (s3Keys.length > 0) {
        await this.listingImageUploadService.cleanupS3Keys(s3Keys);
      }
      if (isPgError(err, PG_CHECK_VIOLATION)) {
        throw new BadRequestException(
          err.detail ?? 'listing violates a data constraint',
        );
      }
      if (isPgError(err, PG_FOREIGN_KEY_VIOLATION)) {
        throw new NotFoundException(`listing ${id} not found`);
      }
      throw err;
    }
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const existing = await this.getOrThrow(id);
    assertCanModify(existing, user);

    // Soft delete is a plain UPDATE, so it won't trip a foreign-key
    // violation the way a hard DELETE used to - check for associated
    // requests/images up front to keep the same external behaviour.
    const [imageCount, requestCount] = await Promise.all([
      this.listingImagesRepository.countByListingId(id),
      this.listingsRepository.countAssociatedRequests(id),
    ]);
    if (imageCount > 0 || requestCount > 0) {
      throw new ConflictException(
        `listing ${id} has associated requests or images and cannot be deleted`,
      );
    }

    await this.listingsRepository.delete(id, existing.version + 1);
  }

  private async attachImages(listing: Listing): Promise<ListingWithImages> {
    const images = await this.listingImagesRepository.findByListingId(
      listing.id,
    );
    return {
      ...listing,
      images: await toListingImageResponses(images, this.s3),
    };
  }

  private async attachImagesToMany(
    listings: Listing[],
  ): Promise<ListingWithImages[]> {
    if (listings.length === 0) return [];

    const images = await this.listingImagesRepository.findByListingIds(
      listings.map((listing) => listing.id),
    );
    const imagesByListingId = new Map<string, typeof images>();
    for (const image of images) {
      const group = imagesByListingId.get(image.listingId);
      if (group) {
        group.push(image);
      } else {
        imagesByListingId.set(image.listingId, [image]);
      }
    }

    return Promise.all(
      listings.map(async (listing) => ({
        ...listing,
        images: await toListingImageResponses(
          imagesByListingId.get(listing.id) ?? [],
          this.s3,
        ),
      })),
    );
  }
}

function assertPickupWindowValid(start: string, end: string): void {
  if (new Date(end).getTime() <= new Date(start).getTime()) {
    throw new BadRequestException(
      'pickupWindowEnd must be after pickupWindowStart',
    );
  }
}
