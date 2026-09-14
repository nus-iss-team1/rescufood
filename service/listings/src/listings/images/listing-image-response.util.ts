import type { S3Service } from '../../storage/s3.service';
import type { ListingImage } from './listing-images.repository';

export interface ListingImageResponse {
  id: string;
  position: number;
  url: string;
  createdAt: Date;
}

export function toListingImageResponses(
  images: ListingImage[],
  s3: S3Service,
): ListingImageResponse[] {
  return images.map((image) => ({
    id: image.id,
    position: image.position,
    url: s3.getImageUrl(image.s3Key),
    createdAt: image.createdAt,
  }));
}
