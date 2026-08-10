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

  @ApiProperty({ enum: listingCategory.enumValues })
  category!: (typeof listingCategory.enumValues)[number];

  @ApiProperty()
  description!: string;

  @ApiProperty({
    type: 'string',
    description: 'Decimal string, e.g. "12.50".',
  })
  remainingQuantity!: string;

  @ApiProperty()
  unit!: string;

  @ApiProperty({ type: [String] })
  allergens!: string[];

  @ApiProperty()
  handlingInstructions!: string;

  @ApiProperty()
  useBy!: Date;

  @ApiProperty()
  pickupLocation!: string;

  @ApiProperty()
  pickupWindowStart!: Date;

  @ApiProperty()
  pickupWindowEnd!: Date;

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
