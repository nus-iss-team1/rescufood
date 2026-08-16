import 'express';

export interface AuthenticatedUser {
  // Raw Cognito `sub` as set by JwtAuthGuard. OrgMembershipGuard and
  // OrgContextGuard overwrite this with service/profile's internal
  // users.id once they run - routes without either guard never get that
  // resolution, so don't persist this into a users.id FK column (created_by,
  // claimed_by, etc.) unless one of those guards ran first.
  userId: string;
  role: string;
  // Set by OrgMembershipGuard, not JwtAuthGuard - only present on routes
  // that require the caller to belong to an organisation.
  orgId?: string;
}

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
