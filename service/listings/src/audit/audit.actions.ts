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
  ClaimIdempotencyConflict: 'claim.idempotency_conflict',
  PickupCodeGenerated: 'pickup_code.generated',
  PickupCodeExhausted: 'pickup_code.exhausted',
  StatsSummaryViewed: 'stats.summary_viewed',
  StatsMetricsViewed: 'stats.metrics_viewed',
} as const;

// Written by service/profile. Canonical strings: its internal/domain/audit.go.
export const ProfileAuditAction = {
  LoginSucceeded: 'auth.login_succeeded',
  LoginFailed: 'auth.login_failed',
  AccountLocked: 'auth.account_locked',
  PasswordReset: 'auth.password_reset',
  UserSuspended: 'user.suspended',
  UserReactivated: 'user.reactivated',
  UserUnlocked: 'user.unlocked',
  OrganisationApproved: 'organisation.approved',
  OrganisationRejected: 'organisation.rejected',
  OrganisationSuspended: 'organisation.suspended',
} as const;
