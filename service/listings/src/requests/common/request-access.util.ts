import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/types/express';

// Either party to the claim (rescue org or donor org) may act - used by
// cancel and no-show.
export function assertIsParty(
  request: { rescueOrgId: string },
  listing: { donorOrgId: string },
  user: AuthenticatedUser,
): void {
  if (user.role === 'admin') return;
  if (request.rescueOrgId !== user.orgId && listing.donorOrgId !== user.orgId) {
    throw new ForbiddenException('you do not have access to this request');
  }
}

// The rescue partner that claimed the listing generates the pickup code.
export function assertIsClaimingPartner(
  request: { rescueOrgId: string },
  user: AuthenticatedUser,
): void {
  if (user.role === 'admin') return;
  if (request.rescueOrgId !== user.orgId) {
    throw new ForbiddenException(
      'only the rescue partner that claimed this listing can generate the pickup code',
    );
  }
}

// The donor enters the pickup code to confirm the handover.
export function assertIsDonor(
  listing: { donorOrgId: string },
  user: AuthenticatedUser,
): void {
  if (user.role === 'admin') return;
  if (listing.donorOrgId !== user.orgId) {
    throw new ForbiddenException('only the donor can verify the pickup code');
  }
}

// Claims aren't publicly browsable - only the two orgs involved (and
// admins) can see one exists.
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
