import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import type { Database } from '../db/db.module';
import { isPgError, PG_FOREIGN_KEY_VIOLATION } from '../db/pg-errors';
import { S3Service } from '../storage/s3.service';
import {
  EXTENSION_BY_MIME_TYPE,
  MAX_IMAGES_PER_LISTING,
} from './image-upload.constants';
import {
  ListingImageResponse,
  toListingImageResponses,
} from './listing-image-response.util';
import {
  ListingImage,
  ListingImagesRepository,
} from './listing-images.repository';

// Pure S3 + listing_images mechanics, with no opinion on whether the caller
// is allowed to touch this listing - existence and ownership are
// ListingsService's responsibility (see its create/update, and
// getOrThrow/assertCanModify). Kept as a separate service (rather than
// folded into ListingsService) because it's split into composable phases
// (uploadToS3 / insertRows / cleanupS3Keys / deleteS3Objects /
// assertImagesBelongToListing) rather than one do-everything method: S3
// calls can't participate in a Postgres transaction, so they have to happen
// outside it, while the DB row changes need to land inside it alongside the
// listing's own field update. `uploadImages` composes the phases into one
// call for the simple case (ListingsService.create, which doesn't need to
// share a transaction with anything else).
@Injectable()
export class ListingImageUploadService {
  constructor(
    private readonly listingImagesRepository: ListingImagesRepository,
    private readonly s3: S3Service,
    private readonly logger: Logger,
  ) {}

  // Convenience wrapper for the standalone add-images endpoint: upload +
  // insert as one unit, with its own cleanup-on-failure.
  async uploadImages(
    listingId: string,
    files: Express.Multer.File[],
  ): Promise<ListingImageResponse[]> {
    if (files.length === 0) return [];

    const existingCount =
      await this.listingImagesRepository.countByListingId(listingId);
    const s3Keys = await this.uploadToS3(listingId, files, existingCount);

    try {
      return await this.insertRows(listingId, s3Keys);
    } catch (err) {
      await this.cleanupS3Keys(s3Keys);
      if (isPgError(err, PG_FOREIGN_KEY_VIOLATION)) {
        throw new NotFoundException(`listing ${listingId} not found`);
      }
      throw err;
    }
  }

  // Validates the per-listing image cap against a caller-supplied
  // `existingCount` (rather than reading it here) so a caller that's also
  // deleting images in the same request can pass the post-deletion count.
  async uploadToS3(
    listingId: string,
    files: Express.Multer.File[],
    existingCount: number,
  ): Promise<string[]> {
    if (files.length === 0) return [];
    if (existingCount + files.length > MAX_IMAGES_PER_LISTING) {
      throw new BadRequestException(
        `a listing can have at most ${MAX_IMAGES_PER_LISTING} images (${existingCount} already present)`,
      );
    }

    const s3Keys = files.map(
      (file) =>
        `listings/${listingId}/${randomUUID()}.${EXTENSION_BY_MIME_TYPE[file.mimetype]}`,
    );
    await Promise.all(
      files.map((file, i) =>
        this.s3.upload(s3Keys[i], file.buffer, file.mimetype),
      ),
    );
    return s3Keys;
  }

  // Inserts already-uploaded S3 keys as listing_images rows. Pass
  // `executor` (an open transaction) to make this part of a larger unit of
  // work; omitted, it opens its own transaction for the insert alone.
  async insertRows(
    listingId: string,
    s3Keys: string[],
    executor?: Database,
  ): Promise<ListingImageResponse[]> {
    if (s3Keys.length === 0) return [];
    const created = await this.listingImagesRepository.insertMany(
      listingId,
      s3Keys,
      executor,
    );
    return toListingImageResponses(created, this.s3);
  }

  // Best-effort cleanup for S3 objects that were uploaded but whose DB
  // insert never committed (insert itself failed, or - when called as part
  // of ListingsService.update's shared transaction - a later statement in
  // that same transaction failed and rolled everything back).
  async cleanupS3Keys(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map((key) =>
        this.s3
          .delete(key)
          .catch((err: unknown) =>
            this.logger.warn(
              { key, err },
              'failed to clean up orphaned listing image after failure',
            ),
          ),
      ),
    );
  }

  // Best-effort S3 cleanup for image rows already confirmed deleted from
  // the DB (safe to call any time after that delete has committed).
  async deleteS3Objects(images: ListingImage[]): Promise<void> {
    await Promise.all(
      images.map((image) =>
        this.s3
          .delete(image.s3Key)
          .catch((err: unknown) =>
            this.logger.warn(
              { key: image.s3Key, err },
              'failed to delete listing image object from S3',
            ),
          ),
      ),
    );
  }

  // Read-only check used before a batch of deletions: every id must exist
  // and belong to this listing, or the whole request is rejected before
  // anything is deleted.
  async assertImagesBelongToListing(
    listingId: string,
    imageIds: string[],
  ): Promise<void> {
    if (imageIds.length === 0) return;

    const images = await Promise.all(
      imageIds.map((id) => this.listingImagesRepository.findById(id)),
    );
    const missing = imageIds.filter(
      (id, i) => !images[i] || images[i].listingId !== listingId,
    );
    if (missing.length > 0) {
      throw new NotFoundException(
        `image(s) not found on this listing: ${missing.join(', ')}`,
      );
    }
  }
}
