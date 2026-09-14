import { ApiProperty } from '@nestjs/swagger';

export class ListingImageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Display order within the listing, 0-based.' })
  position!: number;

  @ApiProperty({
    description: 'Time-limited signed URL - re-fetch the listing once expired.',
  })
  url!: string;

  @ApiProperty()
  createdAt!: Date;
}
