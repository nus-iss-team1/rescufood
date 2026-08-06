import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/types/express';

export function assertCanModify(
  listing: { createdBy: string },
  user: AuthenticatedUser,
): void {
  if (user.role !== 'admin' && listing.createdBy !== user.userId) {
    throw new ForbiddenException('you do not have access to this listing');
  }
}
