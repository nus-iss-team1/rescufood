import { BadRequestException } from '@nestjs/common';
import type { requestStatus } from '../../db/schema';

type RequestStatus = (typeof requestStatus.enumValues)[number];

// Transitions reachable via PATCH .../requests/:id (RequestsService.decide).
// None of `completed`, `expired` or `superseded` are reachable through this
// map - they're all system-driven, never a direct client decision:
// `completed` by the pickup-verification flow (RequestsService.
// verifyPickupCode), `expired` by the listing-expiry sweep, and
// `superseded` by RequestsService.decide's own accept branch (other pending
// requests on a listing that just got fully reserved) and by
// ListingsService.update cancelling the listing outright. `no_show` *is*
// reachable here: either party can report a failed pickup on an accepted
// request. Every terminal state (declined/superseded/cancelled/completed/
// no_show/expired) has no outgoing edges, so nothing can move a request
// again once it lands there.
const ALLOWED_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  pending: ['accepted', 'declined', 'cancelled'],
  accepted: ['cancelled', 'no_show'],
  declined: [],
  superseded: [],
  cancelled: [],
  completed: [],
  no_show: [],
  expired: [],
};

export function assertValidRequestStatusTransition(
  current: RequestStatus,
  next: RequestStatus,
): void {
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new BadRequestException(
      `cannot change request status from ${current} to ${next}`,
    );
  }
}
