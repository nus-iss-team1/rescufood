import { BadRequestException } from '@nestjs/common';
import type { listingStatus } from '../../db/schema';

type ListingStatus = (typeof listingStatus.enumValues)[number];

// Status changes a donor can make via PATCH. reserved/collected/expired are
// entered by other flows, not here; a donor may still cancel a reserved one.
const ALLOWED_TRANSITIONS: Record<ListingStatus, readonly ListingStatus[]> = {
  draft: ['available', 'cancelled'],
  available: ['draft', 'cancelled'],
  reserved: ['cancelled'],
  collected: [],
  expired: [],
  cancelled: [],
};

// Statuses whose fields a donor may still edit.
const EDITABLE_STATUSES: readonly ListingStatus[] = ['draft', 'available'];

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

// Rejects field edits on a listing past draft/available.
export function assertListingIsEditable(status: ListingStatus): void {
  if (!EDITABLE_STATUSES.includes(status)) {
    throw new BadRequestException(
      `listing is ${status} and can no longer be modified`,
    );
  }
}
