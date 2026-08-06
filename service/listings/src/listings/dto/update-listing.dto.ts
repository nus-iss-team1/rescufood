import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { listingStatus } from '../../db/schema';
import { CreateListingDto } from './create-listing.dto';
import { parseMultipartJsonArray } from './multipart-json-array.transform';

export class UpdateListingDto extends PartialType(CreateListingDto) {
  // Optimistic concurrency: caller must echo back the version they last
  // read. See listings.version in db/schema.ts. Sent as a string when the
  // request is multipart (images attached alongside the field update).
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  version!: number;

  @IsOptional()
  @IsIn(listingStatus.enumValues)
  status?: (typeof listingStatus.enumValues)[number];

  @IsOptional()
  @IsString()
  cancelledReason?: string;

  // Existing images to remove in the same request, alongside any new
  // `files` being attached and any field changes - see
  // ListingsService.update. Validated the same way as `files`: applied
  // before the field update, so an unknown/foreign id fails the whole
  // request rather than leaving a partial change.
  @IsOptional()
  @Transform(parseMultipartJsonArray)
  @IsArray()
  @IsUUID('4', { each: true })
  deleteImageIds?: string[];
}
