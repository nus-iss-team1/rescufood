import {
  IsArray,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { listingCategory } from '../../db/schema';

export class CreateListingDto {
  @IsUUID()
  donorOrgId!: string;

  @IsIn(listingCategory.enumValues)
  category!: (typeof listingCategory.enumValues)[number];

  @IsString()
  @MinLength(1)
  description!: string;

  @IsNumber()
  @IsPositive()
  remainingQuantity!: number;

  @IsString()
  @MinLength(1)
  unit!: string;

  @IsOptional()
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
