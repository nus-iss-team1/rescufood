import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/types/express';

// Only the donor org that owns the listing (or an admin) decides a pending
// request - the rescue org that filed it has no say in accept/decline.
export function assertCanRespond(
  listing: { donorOrgId: string },
  user: AuthenticatedUser,
): void {
  if (user.role === 'admin') return;
  if (listing.donorOrgId !== user.orgId) {
    throw new ForbiddenException(
      'only the donor organisation can respond to this request',
    );
  }
}

// Cancellation is symmetric: either the rescue org that filed the request or
// the donor org that owns the listing can back out, before or after accept.
export function assertCanCancel(
  request: { rescueOrgId: string },
  listing: { donorOrgId: string },
  user: AuthenticatedUser,
): void {
  if (user.role === 'admin') return;
  if (request.rescueOrgId !== user.orgId && listing.donorOrgId !== user.orgId) {
    throw new ForbiddenException('you do not have access to this request');
  }
}

// Requests aren't publicly browsable like listings - only the two orgs
// involved (and admins) can see one exists at all.
export function isRequestVisible(
  request: { rescueOrgId: string },
  listing: { donorOrgId: string },
  viewer: AuthenticatedUser,
): boolean {
  return (
    viewer.role === 'admin' ||
    request.rescueOrgId === viewer.orgId ||
    listing.donorOrgId === viewer.orgId
  );
}
