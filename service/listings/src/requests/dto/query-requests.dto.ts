import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { requestStatus } from '../../db/schema';

export const requestSortFields = ['requestedAt', 'updatedAt'] as const;
export type RequestSortField = (typeof requestSortFields)[number];

export const sortOrders = ['asc', 'desc'] as const;
export type SortOrder = (typeof sortOrders)[number];

export class QueryRequestsDto {
  @IsOptional()
  @IsIn(requestStatus.enumValues)
  status?: (typeof requestStatus.enumValues)[number];

  @IsOptional()
  @IsUUID('4')
  listingId?: string;

  @IsOptional()
  @IsIn(requestSortFields)
  sortBy?: RequestSortField = 'requestedAt';

  // Newest-first by default - a donor/rescue org's request inbox cares most
  // about what just came in, unlike listings' soonest-use-by-first default.
  @IsOptional()
  @IsIn(sortOrders)
  sortOrder?: SortOrder = 'desc';

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
