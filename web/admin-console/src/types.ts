export type OrgStatus = "pending" | "approved" | "rejected" | "suspended";

export interface Org {
  id: string;
  name: string;
  type: "donor" | "rescue_partner";
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
