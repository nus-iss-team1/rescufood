import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { listingStatus } from '../../db/schema';
import { CreateListingDto } from './create-listing.dto';

export class UpdateListingDto extends PartialType(
  OmitType(CreateListingDto, ['donorOrgId'] as const),
) {
  // Optimistic concurrency: caller must echo back the version they last
  // read. See listings.version in db/schema.ts.
  @IsInt()
  @IsPositive()
  version!: number;

  @IsOptional()
  @IsIn(listingStatus.enumValues)
  status?: (typeof listingStatus.enumValues)[number];

  @IsOptional()
  @IsString()
  cancelledReason?: string;
}
