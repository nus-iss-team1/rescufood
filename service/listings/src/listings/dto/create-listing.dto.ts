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
import { parseMultipartJsonArray } from './multipart-json-array.transform';

export class CreateListingDto {
  @IsIn(listingCategory.enumValues)
  category!: (typeof listingCategory.enumValues)[number];

  @IsString()
  @MinLength(1)
  description!: string;

  // Sent as a JSON body (real number) or as a multipart form field (string,
  // when images are attached in the same request) - @Type coerces either
  // into a number before validation.
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  remainingQuantity!: number;

  @IsString()
  @MinLength(1)
  unit!: string;

  @IsOptional()
  @Transform(parseMultipartJsonArray)
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @IsOptional()
  @IsString()
  handlingInstructions?: string;

  @IsISO8601()
  useBy!: string;

  @IsString()
  @MinLength(1)
  pickupLocation!: string;

  @IsISO8601()
  pickupWindowStart!: string;

  @IsISO8601()
  pickupWindowEnd!: string;
}
