import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, Matches } from 'class-validator';

export class VerifyPickupCodeDto {
  @ApiProperty({ pattern: '^\\d{6}$', example: '123456' })
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit numeric code' })
  code!: string;

  // Defaults to the full requestedQuantity - only needed when less than the
  // whole lot changed hands.
  @ApiPropertyOptional({
    description:
      'Defaults to the full requestedQuantity when omitted - only needed when less than the whole lot changed hands.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  collectedQuantity?: number;
}
