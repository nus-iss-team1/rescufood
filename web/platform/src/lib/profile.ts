import "server-only";

const base = process.env.PROFILE_API_URL ?? "http://localhost:3001";

export interface Org {
  id: string;
  name: string;
  type: "donor" | "rescue_partner";
  status: "pending" | "approved" | "rejected" | "suspended";
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

export class ProfileApiError extends Error {
  readonly status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

async function request<T>(idToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base}/api/profile${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ProfileApiError(res.status, body.detail || body.title || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function getMe(idToken: string): Promise<Me> {
  return request<Me>(idToken, "/me");
}

export interface NewOrganisation {
  name: string;
  type: string;
  domain: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
}

export function createOrganisation(idToken: string, org: NewOrganisation): Promise<Org> {
  return request<Org>(idToken, "/orgs", {
    method: "POST",
    body: JSON.stringify(org),
  });
}
