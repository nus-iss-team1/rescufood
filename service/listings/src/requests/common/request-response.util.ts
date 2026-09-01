import type { ListingRequest } from '../requests.repository';

export type PublicListingRequest = Omit<
  ListingRequest,
  | 'pickupCode'
  | 'pickupCodeHash'
  | 'pickupCodeAttempts'
  | 'pickupOpenReminderSentAt'
  | 'pickupCloseReminderSentAt'
>;

// Strips the raw pickup code and its hash/attempt counter (either would let a
// reader redeem or brute-force the code) and the internal reminder markers.
// Explicit allowlist so a new sensitive column doesn't leak by default.
export function toPublicRequest(request: ListingRequest): PublicListingRequest {
  return {
    id: request.id,
    listingId: request.listingId,
    rescueOrgId: request.rescueOrgId,
    claimedBy: request.claimedBy,
    status: request.status,
    requestedQuantity: request.requestedQuantity,
    requestedAt: request.requestedAt,
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
