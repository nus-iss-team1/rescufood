import 'express';

export interface AuthenticatedUser {
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
