export type OrgStatus = "pending" | "approved" | "rejected" | "suspended";

export type OrgType = "donor" | "rescue_partner";

export interface Org {
  id: string;
  name: string;
  type: OrgType;
  status: OrgStatus;
  domain: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  created_at: string;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  status: string;
  org: Org | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  status: "active" | "suspended";
  created_at: string;
  /** Set while a failed-login restriction is active; absent otherwise. */
  locked_until?: string | null;
}

/** A user id and how to display them. Ids with no user are simply absent. */
export interface UserName {
  id: string;
  name: string;
}

export interface LoginStatus {
  restricted: boolean;
  retry_after?: string | null;
}

/**
 * Where a login attempt came from, retained with its audit event. Omit a field
 * that could not be determined - it is recorded as absent, never guessed.
 */
export interface LoginAttemptContext {
  /** The X-Forwarded-For chain, verbatim. The service picks the trusted hop. */
  forwardedFor?: string;
  userAgent?: string;
}

export interface ResetEligibility {
  eligible: boolean;
}

export interface NewOrganisation {
  name: string;
  type: string;
  domain: string;
  description?: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
}

export interface DomainLookup {
  registered: boolean;
  approved: boolean;
}

export type OrgCounts = Record<OrgStatus, number>;
