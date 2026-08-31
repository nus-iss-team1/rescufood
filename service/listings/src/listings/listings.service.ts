import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AuditAction } from '../audit/audit.actions';
import { AuditRepository } from '../audit/audit.repository';
import type { AuthenticatedUser } from '../common/types/express';
import { DATABASE, type Database } from '../db/db.module';
import { NotificationsPublisher } from '../notifications/notifications.publisher';
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
import {
  assertListingIsEditable,
  assertValidStatusTransition,
} from './common/listing-status.util';
import {
  PublicationValidationException,
  validateForPublication,
} from './common/publication-validation.util';
import {
  ListingImageResponse,
  toListingImageResponses,
} from './images/listing-image-response.util';
import { ListingImageUploadService } from './images/listing-image-upload.service';
import { ListingImagesRepository } from './images/listing-images.repository';
import { Listing, ListingsRepository } from './listings.repository';

export type ListingWithImages = Listing & { images: ListingImageResponse[] };

// The editable listing fields, for the "reserved listings can't be edited" check.
const LISTING_CONTENT_FIELDS = [
  'category',
  'description',
  'quantity',
  'unit',
  'allergens',
  'handlingInstructions',
  'useBy',
  'pickupLocation',
  'pickupWindowStart',
  'pickupWindowEnd',
] as const satisfies readonly (keyof UpdateListingDto)[];

@Injectable()
export class ListingsService {
  constructor(
    private readonly listingsRepository: ListingsRepository,
    private readonly listingImagesRepository: ListingImagesRepository,
    private readonly listingImageUploadService: ListingImageUploadService,
    private readonly auditRepository: AuditRepository,
    private readonly notifications: NotificationsPublisher,
    private readonly s3: S3Service,
    private readonly logger: Logger,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async create(
    dto: CreateListingDto,
    files: Express.Multer.File[],
    user: AuthenticatedUser,
  ): Promise<ListingWithImages> {
    // Symmetric to the rescue-partner-only claim check in RequestsService:
    // only an active user in an approved donor org can post a listing.
    const eligibility = await this.listingsRepository.findCreatorContext(
      user.userId,
    );
    if (!eligibility || eligibility.userStatus !== 'active') {
      throw new ForbiddenException('your account is not active');
    }
    if (eligibility.orgType !== 'donor') {
      throw new ForbiddenException(
        'only donor organisations can post listings',
      );
    }
    if (eligibility.orgStatus !== 'approved') {
      throw new ForbiddenException(
        'your organisation is not approved to post listings',
      );
    }

    assertPickupWindowValid(dto.pickupWindowStart, dto.pickupWindowEnd);

    const created = await this.db.transaction(async (tx) => {
      const listing = await this.listingsRepository.create(
        {
          // Guaranteed by OrgMembershipGuard, not client input - a listing
          // is always attributed to the caller's own organisation.
          donorOrgId: user.orgId!,
          createdBy: user.userId,
          category: dto.category,
          description: dto.description,
          quantity: dto.quantity?.toString(),
          unit: dto.unit,
          allergens: dto.allergens,
          handlingInstructions: dto.handlingInstructions,
          useBy: dto.useBy ? new Date(dto.useBy) : undefined,
          pickupLocation: dto.pickupLocation,
          pickupWindowStart: dto.pickupWindowStart
            ? new Date(dto.pickupWindowStart)
            : undefined,
          pickupWindowEnd: dto.pickupWindowEnd
            ? new Date(dto.pickupWindowEnd)
            : undefined,
        },
        tx,
      );
      await this.auditRepository.record(
        {
          actor: { userId: user.userId, orgId: user.orgId! },
          action: AuditAction.ListingCreated,
          entityType: 'listing',
          entityId: listing.id,
          metadata: { status: listing.status },
        },
        tx,
      );
      return listing;
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

    // A donor withdrawing a reserved listing skips the editable-status guard,
    // but may change nothing else - the terms are frozen for the partner.
    const isWithdrawingReserved =
      existing.status === 'reserved' && dto.status === 'cancelled';
    if (isWithdrawingReserved) {
      const editsContent =
        files.length > 0 ||
        (dto.deleteImageIds?.length ?? 0) > 0 ||
        LISTING_CONTENT_FIELDS.some((f) => dto[f] !== undefined);
      if (editsContent) {
        throw new BadRequestException(
          'a reserved listing can only be withdrawn, not edited',
        );
      }
    } else {
      assertListingIsEditable(existing.status);
    }

    if (dto.status !== undefined) {
      assertValidStatusTransition(existing.status, dto.status);
    }

    const start =
      dto.pickupWindowStart ?? existing.pickupWindowStart?.toISOString();
    const end = dto.pickupWindowEnd ?? existing.pickupWindowEnd?.toISOString();
    assertPickupWindowValid(start, end);

    // Gates on the post-update status, not just draft->available - editing
    // an already-available listing must not leave it inconsistent either.
    const resultStatus = dto.status ?? existing.status;
    if (resultStatus === 'available') {
      const publicationErrors = validateForPublication({
        category: dto.category ?? existing.category,
        description: dto.description ?? existing.description,
        pickupLocation: dto.pickupLocation ?? existing.pickupLocation,
        unit: dto.unit ?? existing.unit,
        allergens: dto.allergens ?? existing.allergens,
        quantity: dto.quantity ?? existing.quantity,
        pickupWindowStart: start,
        pickupWindowEnd: end,
        useBy: dto.useBy ?? existing.useBy,
      });
      if (publicationErrors.length > 0) {
        throw new PublicationValidationException(publicationErrors);
      }
    }

    const deleteImageIds = dto.deleteImageIds ?? [];
    // Fails fast on an unknown/foreign id before touching S3 or the DB.
    await this.listingImageUploadService.assertImagesBelongToListing(
      id,
      deleteImageIds,
    );

    const audit = deriveUpdateAudit(
      existing.status,
      dto,
      files.length > 0 || deleteImageIds.length > 0,
      isWithdrawingReserved,
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

    let cancelledClaim:
      { id: string; rescueOrgId: string; claimedBy: string } | undefined;

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
              ...(dto.quantity !== undefined && {
                quantity: dto.quantity.toString(),
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

          const actor = { userId: user.userId, orgId: user.orgId ?? null };

          if (isWithdrawingReserved) {
            cancelledClaim = await this.listingsRepository.cancelActiveClaim(
              id,
              dto.cancelledReason ?? '',
              tx,
            );
            if (cancelledClaim) {
              await this.auditRepository.record(
                {
                  actor,
                  action: AuditAction.ClaimCancelled,
                  entityType: 'claim',
                  entityId: cancelledClaim.id,
                  reason: dto.cancelledReason ?? '',
                  metadata: { listingId: id, byDonorWithdrawal: true },
                },
                tx,
              );
            }
          }

          if (audit) {
            await this.auditRepository.record(
              {
                actor,
                action: audit.action,
                entityType: 'listing',
                entityId: id,
                reason: audit.reason,
                metadata: audit.metadata,
              },
              tx,
            );
          }

          return { updated, deletedImages };
        },
      );

      // Only safe to remove the old objects from S3 once the transaction
      // that dropped their DB rows has actually committed.
      await this.listingImageUploadService.deleteS3Objects(deletedImages);
      if (cancelledClaim) {
        await this.notifyClaimWithdrawn(
          cancelledClaim.id,
          cancelledClaim.claimedBy,
          existing,
          dto.cancelledReason,
        );
      }
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

    // Reject deletion while the listing still has requests or images.
    const [imageCount, requestCount] = await Promise.all([
      this.listingImagesRepository.countByListingId(id),
      this.listingsRepository.countAssociatedRequests(id),
    ]);
    if (imageCount > 0 || requestCount > 0) {
      throw new ConflictException(
        `listing ${id} has associated requests or images and cannot be deleted`,
      );
    }

    await this.db.transaction(async (tx) => {
      await this.listingsRepository.delete(id, existing.version + 1, tx);
      await this.auditRepository.record(
        {
          actor: { userId: user.userId, orgId: user.orgId ?? null },
          action: AuditAction.ListingDeleted,
          entityType: 'listing',
          entityId: id,
          metadata: { previousStatus: existing.status },
        },
        tx,
      );
    });
  }

  // Best-effort: tells the rescue-partner user the donor withdrew the listing.
  private async notifyClaimWithdrawn(
    claimId: string,
    rescueUserId: string,
    listing: Listing,
    reason: string | undefined,
  ): Promise<void> {
    try {
      const [contacts, orgs] = await Promise.all([
        this.listingsRepository.findUserContacts([
          rescueUserId,
          listing.createdBy,
        ]),
        this.listingsRepository.findOrgContacts([listing.donorOrgId]),
      ]);
      const recipient = contacts.find((c) => c.id === rescueUserId);
      if (!recipient) return;
      const donor = contacts.find((c) => c.id === listing.createdBy);
      const donorOrg = orgs.find((o) => o.id === listing.donorOrgId);
      await this.notifications.claimEnded(
        recipient.email,
        {
          recipientName: recipient.name,
          listingDescription: listing.description,
          endedBy: 'donor',
          counterpartyName: donor?.name ?? null,
          counterpartyOrgName: donorOrg?.name ?? null,
          reason,
        },
        {
          eventId: `claim:${claimId}:cancelled`,
          recipientUserId: recipient.cognitoSub,
        },
      );
    } catch (err) {
      this.logger.error({ err }, 'withdrawal notification failed');
    }
  }

  private async attachImages(listing: Listing): Promise<ListingWithImages> {
    const images = await this.listingImagesRepository.findByListingId(
      listing.id,
    );
    return {
      ...listing,
      images: toListingImageResponses(images, this.s3),
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

    return listings.map((listing) => ({
      ...listing,
      images: toListingImageResponses(
        imagesByListingId.get(listing.id) ?? [],
        this.s3,
      ),
    }));
  }
}

type ListingStatus = Listing['status'];

// The audit event for one update() call, or null when nothing auditable changed.
function deriveUpdateAudit(
  currentStatus: ListingStatus,
  dto: UpdateListingDto,
  imageChange: boolean,
  isWithdrawingReserved: boolean,
): {
  action: string;
  reason: string;
  metadata: Record<string, unknown>;
} | null {
  const fields = LISTING_CONTENT_FIELDS.filter((f) => dto[f] !== undefined);
  const statusChanged =
    dto.status !== undefined && dto.status !== currentStatus;

  if (statusChanged && dto.status === 'available') {
    return { action: AuditAction.ListingPublished, reason: '', metadata: {} };
  }
  if (statusChanged && dto.status === 'draft') {
    return { action: AuditAction.ListingUnpublished, reason: '', metadata: {} };
  }
  if (statusChanged && dto.status === 'cancelled') {
    return {
      action: AuditAction.ListingCancelled,
      reason: dto.cancelledReason ?? '',
      metadata: {
        previousStatus: currentStatus,
        withdrawal: isWithdrawingReserved,
      },
    };
  }
  if (fields.length > 0 || imageChange) {
    return {
      action: AuditAction.ListingUpdated,
      reason: '',
      metadata: {
        ...(fields.length > 0 && { fields }),
        ...(imageChange && { images: true }),
      },
    };
  }
  return null;
}

// A missing pair isn't an invalid *sequence*, just not filled in yet -
// validateForPublication is what flags that at publish time.
function assertPickupWindowValid(
  start: string | undefined,
  end: string | undefined,
): void {
  if (start === undefined || end === undefined) return;
  if (new Date(end).getTime() <= new Date(start).getTime()) {
    throw new BadRequestException(
      'pickupWindowEnd must be after pickupWindowStart',
    );
  }
}
