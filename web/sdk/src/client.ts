import type {
  DomainLookup,
  Me,
  NewOrganisation,
  Org,
  OrgCounts,
  OrgStatus,
  User,
} from "./types";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

export interface ProfileClientOptions {
  /** Base URL of the profile service, e.g. http://localhost:3001 */
  baseUrl: string;
  /** Returns the bearer token for authenticated calls. */
  getToken?: () => string | null | Promise<string | null>;
  /** Called whenever the API answers 401. */
  onUnauthorized?: () => void;
  fetch?: typeof fetch;
}

export class ProfileClient {
  private readonly opts: ProfileClientOptions;

  constructor(opts: ProfileClientOptions) {
    this.opts = opts;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const doFetch = this.opts.fetch ?? fetch;
    const token = (await this.opts.getToken?.()) ?? null;
    const res = await doFetch(`${this.opts.baseUrl}/api/profile${path}`, {
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    if (res.status === 401) {
      this.opts.onUnauthorized?.();
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.detail || body.title || res.statusText);
    }
    return res.json() as Promise<T>;
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body) });
  }

  // ------------------------------------------------------------ public

  registerOrganisation(org: NewOrganisation): Promise<Org> {
    return this.post("/orgs/register", org);
  }

  lookupOrganisation(domain: string): Promise<DomainLookup> {
    return this.request(`/orgs/lookup?domain=${encodeURIComponent(domain)}`);
  }

  // ----------------------------------------------------- authenticated

  getMe(): Promise<Me> {
    return this.request("/me");
  }

  // ------------------------------------------------------------- admin

  listOrgs(status: OrgStatus | "all"): Promise<Org[]> {
    return this.request(`/admin/orgs/?status=${status}`);
  }

  countOrgs(): Promise<OrgCounts> {
    return this.request("/admin/orgs/counts");
  }

  approveOrg(id: string, reason: string): Promise<Org> {
    return this.post(`/admin/orgs/${id}/approve`, { reason });
  }

  rejectOrg(id: string, reason: string): Promise<Org> {
    return this.post(`/admin/orgs/${id}/reject`, { reason });
  }

  suspendOrg(id: string, reason: string): Promise<Org> {
    return this.post(`/admin/orgs/${id}/suspend`, { reason });
  }

  listOrgMembers(orgId: string): Promise<User[]> {
    return this.request(`/admin/users/?org_id=${orgId}`);
  }

  suspendUser(id: string, reason: string): Promise<User> {
    return this.post(`/admin/users/${id}/suspend`, { reason });
  }

  reactivateUser(id: string, reason: string): Promise<User> {
    return this.post(`/admin/users/${id}/reactivate`, { reason });
  }
}
