import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

// The only two decisions a client can make; `completed`/`expired` are
// system-driven. See request-status.util.ts for the transition map.
export const requestDecisions = ['cancelled', 'no_show'] as const;
export type RequestDecision = (typeof requestDecisions)[number];

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateRequestDto {
  // No version field: RequestsService.decide CASes on the status it read,
  // which a claim leaves only once.
  @ApiProperty({ enum: requestDecisions })
  @IsIn(requestDecisions)
  status!: RequestDecision;

  @ApiPropertyOptional({
    description: 'Required, and non-blank, when status is "cancelled".',
  })
  @ValidateIf((dto: UpdateRequestDto) => dto.status === 'cancelled')
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'a cancellation reason is required' })
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'Only used when status is "no_show".' })
  @IsOptional()
  @IsString()
  noShowReason?: string;
}
