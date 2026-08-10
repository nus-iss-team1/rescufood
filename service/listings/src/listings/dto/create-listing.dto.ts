import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateListingDto {
  @ApiProperty({ enum: listingCategory.enumValues })
  @IsIn(listingCategory.enumValues)
  category!: (typeof listingCategory.enumValues)[number];

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description!: string;

  // Sent as a JSON body (real number) or as a multipart form field (string,
  // when images are attached in the same request) - @Type coerces either
  // into a number before validation.
  @ApiProperty({
    example: 10,
    description:
      'Sent as a JSON number, or as a string form field when images are attached in the same multipart request.',
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  remainingQuantity!: number;

  @ApiProperty({ example: 'kg' })
  @IsString()
  @MinLength(1)
  unit!: string;

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

  @ApiProperty({ format: 'date-time' })
  @IsISO8601()
  useBy!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  pickupLocation!: string;

  @ApiProperty({ format: 'date-time' })
  @IsISO8601()
  pickupWindowStart!: string;

  @ApiProperty({ format: 'date-time' })
  @IsISO8601()
  pickupWindowEnd!: string;
}
