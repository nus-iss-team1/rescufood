import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, Matches } from 'class-validator';

export class VerifyPickupCodeDto {
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit numeric code' })
  code!: string;

  // Defaults to the full requestedQuantity when omitted (see
  // RequestsService.verifyPickupCode) - only needed when less than what was
  // accepted actually changed hands.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  collectedQuantity?: number;
}
