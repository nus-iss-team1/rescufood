import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/types/express';

// Requires the caller's *current* org membership to match the listing's
// donor org, not just that they were the original creator - a user who
// created a listing and then left (or was removed from) that org should
// lose the ability to edit/delete it. Callers must run OrgMembershipGuard
// first so `user.orgId` reflects the caller's membership as of this request.
export function assertCanModify(
  listing: { createdBy: string; donorOrgId: string },
  user: AuthenticatedUser,
): void {
  if (user.role === 'admin') return;
  if (listing.createdBy !== user.userId || listing.donorOrgId !== user.orgId) {
    throw new ForbiddenException('you do not have access to this listing');
  }
}

// Draft listings are a donor org's private staging state - only visible to
// that org's own members (and admins) until the org publishes them by
// moving off `draft`. Every other status is visible platform-wide, since
// rescue orgs need to browse/claim listings they don't own.
export function isListingVisible(
  listing: { status: string; donorOrgId: string },
  user: AuthenticatedUser,
): boolean {
  return (
    listing.status !== 'draft' ||
    user.role === 'admin' ||
    listing.donorOrgId === user.orgId
  );
}
