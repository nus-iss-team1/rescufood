import { BadRequestException } from '@nestjs/common';
import type { requestStatus } from '../../db/schema';

type RequestStatus = (typeof requestStatus.enumValues)[number];

// Transitions reachable via PATCH .../requests/:id (RequestsService.decide).
// `superseded`, `completed`, `no_show` and `expired` are driven by the
// pickup-verification flow and the listing-expiry sweep respectively - none
// of the four are reachable through this map, so this endpoint can never be
// used to set them. Every terminal state (declined/superseded/cancelled/
// completed/no_show/expired) has no outgoing edges, so nothing can move a
// request again once it lands there.
const ALLOWED_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  pending: ['accepted', 'declined', 'cancelled'],
  accepted: ['cancelled'],
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
