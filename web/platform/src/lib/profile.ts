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

async function request<T>(idToken: string | null, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base}/api/profile${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
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

/** Public endpoint: organisations register before their users sign up. */
export function registerOrganisation(org: NewOrganisation): Promise<Org> {
  return request<Org>(null, "/orgs/register", {
    method: "POST",
    body: JSON.stringify(org),
  });
}

/** Public endpoint backing the signup gate. */
export function lookupOrganisation(
  domain: string
): Promise<{ registered: boolean; approved: boolean }> {
  return request(null, `/orgs/lookup?domain=${encodeURIComponent(domain)}`);
}
