import { BadRequestException } from '@nestjs/common';
import type { listingStatus } from '../../db/schema';

type ListingStatus = (typeof listingStatus.enumValues)[number];

// Transitions a donor can trigger directly via PATCH .../listings/:id.
// `reserved` and `collected` are driven by the request/pickup flow (see the
// `requests` table in db/schema.ts) and `expired` by the automatic sweep
// (see listing-expiry.service.ts) - none of the three are reachable through
// this map, so setting them via the update endpoint is always rejected.
// Once a listing lands in a terminal state (reserved/collected/expired/
// cancelled all have no outgoing edges here), nothing can move it again.
const ALLOWED_TRANSITIONS: Record<ListingStatus, readonly ListingStatus[]> = {
  draft: ['available', 'cancelled'],
  available: ['draft', 'cancelled'],
  reserved: [],
  collected: [],
  expired: [],
  cancelled: [],
};

export function assertValidStatusTransition(
  current: ListingStatus,
  next: ListingStatus,
): void {
  if (current === next) return;
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new BadRequestException(
      `cannot change listing status from ${current} to ${next}`,
    );
  }
}
