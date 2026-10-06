import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, Matches } from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Reporting period as Singapore calendar days, both ends inclusive.
export class StatsFiltersDto {
  @ApiPropertyOptional({
    format: 'date',
    example: '2026-10-01',
    description:
      'First day of the period, inclusive, as a Singapore calendar day.',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'from must be a date in YYYY-MM-DD format' })
  @IsISO8601({ strict: true }, { message: 'from must be a real calendar date' })
  from?: string;

  @ApiPropertyOptional({
    format: 'date',
    example: '2026-10-31',
    description:
      'Last day of the period, inclusive, as a Singapore calendar day.',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'to must be a date in YYYY-MM-DD format' })
  @IsISO8601({ strict: true }, { message: 'to must be a real calendar date' })
  to?: string;
}
