import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, max } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/db.module';
import { listingImages } from '../../db/schema';

export type ListingImage = typeof listingImages.$inferSelect;

@Injectable()
export class ListingImagesRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async countByListingId(listingId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(listingImages)
      .where(eq(listingImages.listingId, listingId));
    return row.value;
  }

  // The max(position) read and the insert must land in the same
  // transaction so concurrent uploads for the same listing can't both land
  // on the same position (which would trip the
  // listing_images_listing_position_uq unique index). When `executor` is
  // given (an already-open transaction from a caller composing a larger
  // unit of work, e.g. ListingsService.update), that guarantee comes from
  // the caller's transaction instead and no separate one is opened here.
  async insertMany(
    listingId: string,
    s3Keys: string[],
    executor?: Database,
  ): Promise<ListingImage[]> {
    const run = async (exec: Database) => {
      const [row] = await exec
        .select({ value: max(listingImages.position) })
        .from(listingImages)
        .where(eq(listingImages.listingId, listingId));
      const nextPosition = (row?.value ?? -1) + 1;

      return exec
        .insert(listingImages)
        .values(
          s3Keys.map((s3Key, i) => ({
            listingId,
            s3Key,
            position: nextPosition + i,
          })),
        )
        .returning();
    };
    return executor ? run(executor) : this.db.transaction(run);
  }

  findByListingId(listingId: string): Promise<ListingImage[]> {
    return this.db
      .select()
      .from(listingImages)
      .where(eq(listingImages.listingId, listingId))
      .orderBy(asc(listingImages.position));
  }

  // Batch lookup for embedding images into a page of listings (findAll) -
  // one query instead of one per listing. Ordered by position so callers
  // can group by listingId and already have each group in display order.
  findByListingIds(listingIds: string[]): Promise<ListingImage[]> {
    if (listingIds.length === 0) return Promise.resolve([]);
    return this.db
      .select()
      .from(listingImages)
      .where(inArray(listingImages.listingId, listingIds))
      .orderBy(asc(listingImages.position));
  }

  async findById(imageId: string): Promise<ListingImage | undefined> {
    const [image] = await this.db
      .select()
      .from(listingImages)
      .where(eq(listingImages.id, imageId));
    return image;
  }

  // Single-statement batch delete (vs. N separate calls) so a multi-image
  // deletion is atomic on its own, and can also run as part of a larger
  // transaction via `executor`. Scoped by listingId as well as id so it
  // can never delete an image belonging to a different listing.
  deleteMany(
    listingId: string,
    imageIds: string[],
    executor?: Database,
  ): Promise<ListingImage[]> {
    const exec = executor ?? this.db;
    return exec
      .delete(listingImages)
      .where(
        and(
          eq(listingImages.listingId, listingId),
          inArray(listingImages.id, imageIds),
        ),
      )
      .returning();
  }
}
