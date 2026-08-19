import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { listingCategory } from '../../db/schema';
import { parseMultipartJsonArray } from './transforms/multipart-json-array.transform';

// All fields optional: a Draft can be saved with only some of these filled
// in. A field that *is* provided still has to be valid - only its presence
// is optional. validateForPublication (publication-validation.util.ts) is
// what requires them all before a listing can become 'available'.
export class CreateListingDto {
  @ApiPropertyOptional({ enum: listingCategory.enumValues })
  @IsOptional()
  @IsIn(listingCategory.enumValues)
  category?: (typeof listingCategory.enumValues)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  // Sent as a JSON body (real number) or as a multipart form field (string,
  // when images are attached in the same request) - @Type coerces either
  // into a number before validation.
  @ApiPropertyOptional({
    example: 10,
    description:
      'Sent as a JSON number, or as a string form field when images are attached in the same multipart request.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  remainingQuantity?: number;

  @ApiPropertyOptional({ example: 'kg' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  unit?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Sent as a JSON array, or as a JSON-encoded string form field in a multipart request.',
  })
  @IsOptional()
  @Transform(parseMultipartJsonArray)
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  handlingInstructions?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  useBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  pickupLocation?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  pickupWindowStart?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  pickupWindowEnd?: string;
}
