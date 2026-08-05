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
