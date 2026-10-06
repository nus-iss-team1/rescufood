import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsOptional,
  IsUUID,
  Matches,
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Rejects a `to` earlier than `from`; leaves malformed dates to their own checks.
@ValidatorConstraint({ name: 'periodOrder' })
class PeriodOrder implements ValidatorConstraintInterface {
  validate(to: unknown, args: ValidationArguments): boolean {
    const { from } = args.object as StatsFiltersDto;
    if (typeof to !== 'string' || typeof from !== 'string') return true;
    if (!DATE_ONLY.test(to) || !DATE_ONLY.test(from)) return true;
    return to >= from;
  }

  defaultMessage(args: ValidationArguments): string {
    const { from } = args.object as StatsFiltersDto;
    return `to (${String(args.value)}) must not be before from (${from})`;
  }
}

// Reporting period as Singapore calendar days, both ends inclusive, and the org to report on.
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
  @Validate(PeriodOrder)
  to?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Organisation to report on. Required for administrators, who belong to no organisation.',
  })
  @IsOptional()
  @IsUUID()
  orgId?: string;
}
