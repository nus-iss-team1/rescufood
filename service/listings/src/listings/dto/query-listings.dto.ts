import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { listingCategory, listingStatus } from '../../db/schema';

export class QueryListingsDto {
  @IsOptional()
  @IsIn(listingStatus.enumValues)
  status?: (typeof listingStatus.enumValues)[number];

  @IsOptional()
  @IsIn(listingCategory.enumValues)
  category?: (typeof listingCategory.enumValues)[number];

  @IsOptional()
  @IsString()
  pickupLocation?: string;

  @IsOptional()
  @IsUUID()
  donorOrgId?: string;

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
