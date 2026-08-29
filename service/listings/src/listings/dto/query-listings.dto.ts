import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { listingCategory, listingStatus } from '../../db/schema';

export const listingSortFields = [
  'useBy',
  'pickupWindowStart',
  'pickupWindowEnd',
  'quantity',
  'createdAt',
] as const;
export type ListingSortField = (typeof listingSortFields)[number];

export const sortOrders = ['asc', 'desc'] as const;
export type SortOrder = (typeof sortOrders)[number];

export class QueryListingsDto {
  @ApiPropertyOptional({ enum: listingStatus.enumValues })
  @IsOptional()
  @IsIn(listingStatus.enumValues)
  status?: (typeof listingStatus.enumValues)[number];

  @ApiPropertyOptional({ enum: listingCategory.enumValues })
  @IsOptional()
  @IsIn(listingCategory.enumValues)
  category?: (typeof listingCategory.enumValues)[number];

  // Substring match, not exact - "123 Main" should find "123 Main St".
  @ApiPropertyOptional({
    description: 'Substring match, e.g. "123 Main" matches "123 Main St".',
  })
  @IsOptional()
  @IsString()
  pickupLocation?: string;

  // Donor organisations aren't a fixed set the way status/category are, so
  // this can't be an @IsIn enum - callers pick a name (e.g. from a typeahead
  // backed by the profile service) and the service translates it to the
  // donor_org_id the listings table actually stores.
  @ApiPropertyOptional({
    description:
      'Donor organisation name (e.g. from a typeahead backed by the profile service) - translated server-side to the donor org id.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  donorOrgName?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  useByFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  useByTo?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  pickupWindowStartFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  pickupWindowStartTo?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  pickupWindowEndFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  pickupWindowEndTo?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  createdAtFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  createdAtTo?: string;

  @ApiPropertyOptional({ enum: listingSortFields, default: 'useBy' })
  @IsOptional()
  @IsIn(listingSortFields)
  sortBy?: ListingSortField = 'useBy';

  @ApiPropertyOptional({ enum: sortOrders, default: 'asc' })
  @IsOptional()
  @IsIn(sortOrders)
  sortOrder?: SortOrder = 'asc';

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
