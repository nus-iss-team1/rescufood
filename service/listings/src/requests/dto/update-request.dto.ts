import { IsIn, IsOptional, IsString } from 'class-validator';

// The only three decisions reachable through this endpoint - `superseded`,
// `completed`, `no_show` and `expired` are system-driven (pickup flow /
// listing-expiry sweep), never a direct client decision. See
// request-status.util.ts for the full transition map.
export const requestDecisions = ['accepted', 'declined', 'cancelled'] as const;
export type RequestDecision = (typeof requestDecisions)[number];

export class UpdateRequestDto {
  // No version field: unlike listings, requests have no `version` column.
  // A request only ever leaves `pending` once (see request-status.util.ts -
  // every other state is terminal), so RequestsService.decide CASes on the
  // status it read instead - equivalent optimistic-concurrency protection
  // without asking the caller to echo anything back.
  @IsIn(requestDecisions)
  status!: RequestDecision;

  @IsOptional()
  @IsString()
  declineReason?: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
