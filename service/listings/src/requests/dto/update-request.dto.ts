import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

// The only two decisions a client can make; `completed`/`expired` are
// system-driven. See request-status.util.ts for the transition map.
export const requestDecisions = ['cancelled', 'no_show'] as const;
export type RequestDecision = (typeof requestDecisions)[number];

export class UpdateRequestDto {
  // No version field: RequestsService.decide CASes on the status it read,
  // which a claim leaves only once.
  @ApiProperty({ enum: requestDecisions })
  @IsIn(requestDecisions)
  status!: RequestDecision;

  @ApiPropertyOptional({ description: 'Only used when status is "cancelled".' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'Only used when status is "no_show".' })
  @IsOptional()
  @IsString()
  noShowReason?: string;
}
