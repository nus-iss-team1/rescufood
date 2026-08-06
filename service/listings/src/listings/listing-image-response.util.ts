import type { S3Service } from '../storage/s3.service';
import type { ListingImage } from './listing-images.repository';

export interface ListingImageResponse {
  id: string;
  position: number;
  url: string;
  createdAt: Date;
}

// getSignedUrl is a local signature computation, not an S3 call, so signing
// a whole page of images in parallel costs no extra network round trips.
export function toListingImageResponses(
  images: ListingImage[],
  s3: S3Service,
): Promise<ListingImageResponse[]> {
  return Promise.all(
    images.map(async (image) => ({
      id: image.id,
      position: image.position,
      url: await s3.getSignedUrl(image.s3Key),
      createdAt: image.createdAt,
    })),
  );
}
