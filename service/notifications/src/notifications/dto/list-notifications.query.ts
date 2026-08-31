import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class ListNotificationsQuery {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // Keyset cursor: return notifications created strictly before this instant.
  @IsOptional()
  @IsISO8601()
  before?: string;
}
