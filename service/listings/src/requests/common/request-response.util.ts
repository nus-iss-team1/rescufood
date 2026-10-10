import type { listings } from '../../db/schema';
import type { ListingRequest } from '../requests.repository';

// The lot's display fields, returned alongside a request by the read endpoints.
export type RequestListingSummary = {
  listingDescription: string | null;
  listingUnit: string | null;
  listingCategory: (typeof listings.$inferSelect)['category'];
  listingImageUrl: string | null;
};

export const noListingSummary: RequestListingSummary = {
  listingDescription: null,
  listingUnit: null,
  listingCategory: null,
  listingImageUrl: null,
};

export type PublicListingRequest = Omit<
  ListingRequest,
  | 'pickupCode'
  | 'pickupCodeHash'
  | 'pickupCodeAttempts'
  | 'pickupCodeGeneratedAt'
  | 'pickupOpenReminderSentAt'
  | 'pickupCloseReminderSentAt'
> &
  RequestListingSummary;

// Strips the raw pickup code and its hash/attempt counter (either would let a
// reader redeem or brute-force the code) and the internal reminder markers.
// Explicit allowlist so a new sensitive column doesn't leak by default.
export function toPublicRequest(
  request: ListingRequest,
  listing: RequestListingSummary = noListingSummary,
): PublicListingRequest {
  return {
    ...listing,
    id: request.id,
    listingId: request.listingId,
    rescueOrgId: request.rescueOrgId,
    claimedBy: request.claimedBy,
    status: request.status,
    requestedQuantity: request.requestedQuantity,
    requestedAt: request.requestedAt,
    cancelledAt: request.cancelledAt,
    cancellationReason: request.cancellationReason,
    cancelledBy: request.cancelledBy,
    cancelledByOrgId: request.cancelledByOrgId,
    codeExpiresAt: request.codeExpiresAt,
    codeGeneratedBy: request.codeGeneratedBy,
    verifiedBy: request.verifiedBy,
    collectedQuantity: request.collectedQuantity,
    collectedAt: request.collectedAt,
    noShowAt: request.noShowAt,
    noShowReason: request.noShowReason,
    noShowBy: request.noShowBy,
    noShowByOrgId: request.noShowByOrgId,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}
