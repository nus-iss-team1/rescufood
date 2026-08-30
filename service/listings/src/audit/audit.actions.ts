// Audit action names. `<entity>.<event>`.
export const AuditAction = {
  ListingCreated: 'listing.created',
  ListingUpdated: 'listing.updated',
  ListingPublished: 'listing.published',
  ListingUnpublished: 'listing.unpublished',
  ListingCancelled: 'listing.cancelled',
  ListingDeleted: 'listing.deleted',
  ListingCollected: 'listing.collected',
  ListingExpired: 'listing.expired',
  ClaimCreated: 'claim.created',
  ClaimCancelled: 'claim.cancelled',
  ClaimNoShow: 'claim.no_show',
  ClaimCompleted: 'claim.completed',
  ClaimExpired: 'claim.expired',
  PickupCodeGenerated: 'pickup_code.generated',
} as const;
