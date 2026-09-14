import { BadRequestException } from '@nestjs/common';
import type { requestStatus } from '../../db/schema';

type RequestStatus = (typeof requestStatus.enumValues)[number];

// Transitions reachable via PATCH .../requests/:id. Either party to an
// 'active' claim can cancel it or report a no-show; 'completed' and
// 'expired' are system-driven (pickup verification, expiry sweep). Every
// terminal state has no outgoing edges.
const ALLOWED_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  active: ['cancelled', 'no_show'],
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
