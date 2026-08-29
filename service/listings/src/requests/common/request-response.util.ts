import type { ListingRequest } from '../requests.repository';

export type PublicListingRequest = Omit<
  ListingRequest,
  'pickupCodeHash' | 'pickupCodeAttempts'
>;

// Strips the pickup-code hash and attempt counter - returning the hash
// would let a reader brute-force the code offline. Explicit allowlist so a
// new sensitive column doesn't leak by default.
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
