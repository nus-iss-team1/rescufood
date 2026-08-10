import type { ListingRequest } from '../requests.repository';

export type PublicListingRequest = Omit<
  ListingRequest,
  'pickupCodeHash' | 'pickupCodeAttempts'
>;

// Strips fields that exist purely for server-side pickup-code verification.
// Neither is useful to a client - and returning the hash would let an
// attacker who can read API responses (e.g. an admin view, or a bug) brute
// -force the 6-digit code space offline, unbounded by
// MAX_PICKUP_CODE_ATTEMPTS, which only guards the verify endpoint itself.
// Built as an explicit allowlist (not a destructure-and-discard) so a new
// sensitive column added to the table later doesn't leak by default.
export function toPublicRequest(request: ListingRequest): PublicListingRequest {
  return {
    id: request.id,
    listingId: request.listingId,
    rescueOrgId: request.rescueOrgId,
    claimedBy: request.claimedBy,
    idempotencyKey: request.idempotencyKey,
    status: request.status,
    requestedQuantity: request.requestedQuantity,
    requestedAt: request.requestedAt,
    respondedBy: request.respondedBy,
    respondedAt: request.respondedAt,
    declineReason: request.declineReason,
    cancelledAt: request.cancelledAt,
    cancellationReason: request.cancellationReason,
    codeExpiresAt: request.codeExpiresAt,
    codeGeneratedBy: request.codeGeneratedBy,
    verifiedBy: request.verifiedBy,
    collectedQuantity: request.collectedQuantity,
    collectedAt: request.collectedAt,
    noShowReason: request.noShowReason,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}
