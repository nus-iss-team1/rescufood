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
  'remainingQuantity',
  'createdAt',
] as const;
export type ListingSortField = (typeof listingSortFields)[number];

export const sortOrders = ['asc', 'desc'] as const;
export type SortOrder = (typeof sortOrders)[number];

export class QueryListingsDto {
  @IsOptional()
  @IsIn(listingStatus.enumValues)
  status?: (typeof listingStatus.enumValues)[number];

  @IsOptional()
  @IsIn(listingCategory.enumValues)
  category?: (typeof listingCategory.enumValues)[number];

  // Substring match, not exact - "123 Main" should find "123 Main St".
  @IsOptional()
  @IsString()
  pickupLocation?: string;

  // Donor organisations aren't a fixed set the way status/category are, so
  // this can't be an @IsIn enum - callers pick a name (e.g. from a typeahead
  // backed by the profile service) and the service translates it to the
  // donor_org_id the listings table actually stores.
  @IsOptional()
  @IsString()
  @MinLength(1)
  donorOrgName?: string;

  @IsOptional()
  @IsISO8601()
  useByFrom?: string;

  @IsOptional()
  @IsISO8601()
  useByTo?: string;

  @IsOptional()
  @IsISO8601()
  pickupWindowStartFrom?: string;

  @IsOptional()
  @IsISO8601()
  pickupWindowStartTo?: string;

  @IsOptional()
  @IsISO8601()
  pickupWindowEndFrom?: string;

  @IsOptional()
  @IsISO8601()
  pickupWindowEndTo?: string;

  @IsOptional()
  @IsISO8601()
  createdAtFrom?: string;

  @IsOptional()
  @IsISO8601()
  createdAtTo?: string;

  @IsOptional()
  @IsIn(listingSortFields)
  sortBy?: ListingSortField = 'useBy';

  @IsOptional()
  @IsIn(sortOrders)
  sortOrder?: SortOrder = 'asc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
