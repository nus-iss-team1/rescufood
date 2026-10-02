import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

// Filters both audit reads share, so paging and timestamp bounds mean the
// same thing on each.
export class AuditFiltersDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Actor who performed the change. System-driven events have no actor, ' +
      'so this never matches them.',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Inclusive lower bound on the event timestamp.',
  })
  @IsOptional()
  @IsISO8601()
  createdAtFrom?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Inclusive upper bound on the event timestamp.',
  })
  @IsOptional()
  @IsISO8601()
  createdAtTo?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
