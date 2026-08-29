import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/types/express';

// Either party to the claim (rescue org or donor org) may act - used by
// cancel, no-show, and the pickup-code flow.
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
