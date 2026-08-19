import { ApiProperty } from '@nestjs/swagger';
import { listingCategory, listingStatus } from '../../db/schema';
import { ListingImageResponseDto } from './listing-image-response.dto';

export class ListingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  donorOrgId!: string;

  @ApiProperty({ format: 'uuid' })
  createdBy!: string;

  @ApiProperty({ enum: listingCategory.enumValues, nullable: true })
  category!: (typeof listingCategory.enumValues)[number] | null;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Decimal string, e.g. "12.50".',
  })
  remainingQuantity!: string | null;

  @ApiProperty({ type: String, nullable: true })
  unit!: string | null;

  @ApiProperty({ type: [String] })
  allergens!: string[];

  @ApiProperty()
  handlingInstructions!: string;

  @ApiProperty({ type: String, nullable: true })
  useBy!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  pickupLocation!: string | null;

  @ApiProperty({ type: String, nullable: true })
  pickupWindowStart!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  pickupWindowEnd!: Date | null;

  @ApiProperty({ enum: listingStatus.enumValues })
  status!: (typeof listingStatus.enumValues)[number];

  @ApiProperty({ description: 'Optimistic-concurrency token for PATCH.' })
  version!: number;

  @ApiProperty()
  cancelledReason!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: String, nullable: true })
  deletedAt!: Date | null;

  @ApiProperty({ type: [ListingImageResponseDto] })
  images!: ListingImageResponseDto[];
}
