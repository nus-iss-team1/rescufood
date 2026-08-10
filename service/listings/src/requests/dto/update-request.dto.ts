import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

// The only four decisions reachable through this endpoint - `superseded`,
// `completed` and `expired` are system-driven (pickup-verification flow /
// listing-expiry sweep), never a direct client decision. `no_show` *is*
// client-driven (either party reporting a failed pickup), unlike the other
// two pickup-related states. See request-status.util.ts for the full
// transition map.
export const requestDecisions = [
  'accepted',
  'declined',
  'cancelled',
  'no_show',
] as const;
export type RequestDecision = (typeof requestDecisions)[number];

export class UpdateRequestDto {
  // No version field: unlike listings, requests have no `version` column.
  // A request only ever leaves `pending` once (see request-status.util.ts -
  // every other state is terminal), so RequestsService.decide CASes on the
  // status it read instead - equivalent optimistic-concurrency protection
  // without asking the caller to echo anything back.
  @ApiProperty({ enum: requestDecisions })
  @IsIn(requestDecisions)
  status!: RequestDecision;

  @ApiPropertyOptional({ description: 'Only used when status is "declined".' })
  @IsOptional()
  @IsString()
  declineReason?: string;

  @ApiPropertyOptional({ description: 'Only used when status is "cancelled".' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @ApiPropertyOptional({ description: 'Only used when status is "no_show".' })
  @IsOptional()
  @IsString()
  noShowReason?: string;
}
