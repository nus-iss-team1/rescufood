import type {
  Listing,
  ListingsApi,
  ListingQuery,
  ListingRequest,
  ListingUpdate,
  NewListing,
  NewRequest,
  Paginated,
  PickupCode,
  RequestDecisionInput,
  RequestQuery,
  VerifyPickup,
} from "./types";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

export interface ListingsClientOptions {
  /** Base URL of the listings service, e.g. http://localhost:3002 */
  baseUrl: string;
  /** Returns the bearer token for authenticated calls. */
  getToken?: () => string | null | Promise<string | null>;
  /** Called whenever the API answers 401. */
  onUnauthorized?: () => void;
  fetch?: typeof fetch;
}

/** Drops undefined entries and stringifies the rest. */
function searchParams(query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Packs listing fields and images into one multipart body. Arrays are
 * JSON-encoded, matching the service's multipart-json-array transform.
 */
function multipart(fields: object, files: Blob[]): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    form.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
  }
  for (const file of files) {
    form.append("files", file);
  }
  return form;
}

export class ListingsClient implements ListingsApi {
  private readonly opts: ListingsClientOptions;

  constructor(opts: ListingsClientOptions) {
    this.opts = opts;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const doFetch = this.opts.fetch ?? fetch;
    const token = (await this.opts.getToken?.()) ?? null;
    // FormData sets its own content-type, boundary included.
    const isForm = init.body instanceof FormData;
    const res = await doFetch(`${this.opts.baseUrl}/api${path}`, {
      cache: "no-store",
      ...init,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    if (res.status === 401) {
      this.opts.onUnauthorized?.();
    }
    if (!res.ok) {
      throw new ApiError(res.status, await errorDetail(res));
    }
    if (res.status === 204) {
      return undefined as T;
    }
    return res.json() as Promise<T>;
  }

  private send<T>(method: string, path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method,
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  // ---------------------------------------------------------- listings

  listListings(query: ListingQuery = {}): Promise<Paginated<Listing>> {
    return this.request(`/listings${searchParams(query)}`);
  }

  getListing(id: string): Promise<Listing> {
    return this.request(`/listings/${id}`);
  }

  /** Donor-org members only. Images are optional and go up in the same call. */
  createListing(listing: NewListing, images: Blob[] = []): Promise<Listing> {
    const body = images.length ? multipart(listing, images) : listing;
    return this.send("POST", "/listings", body);
  }

  /** Requires the version last read, or the service answers 409. */
  updateListing(
    id: string,
    update: ListingUpdate,
    images: Blob[] = []
  ): Promise<Listing> {
    const body = images.length ? multipart(update, images) : update;
    return this.send("PATCH", `/listings/${id}`, body);
  }

  /** Soft-delete, not reversible through the API. */
  deleteListing(id: string): Promise<void> {
    return this.request(`/listings/${id}`, { method: "DELETE" });
  }

  // ---------------------------------------------------------- requests

  listRequests(query: RequestQuery = {}): Promise<Paginated<ListingRequest>> {
    return this.request(`/requests${searchParams(query)}`);
  }

  getRequest(id: string): Promise<ListingRequest> {
    return this.request(`/requests/${id}`);
  }

  /**
   * Claims the whole listing first-come-first-served. Idempotent per org on
   * the request's idempotencyKey - an identical retry replays the original
   * claim; reusing a key for a different listing is a 409.
   */
  createRequest(request: NewRequest): Promise<ListingRequest> {
    return this.send("POST", "/requests", request);
  }

  /** Cancel a claim or report a no-show. */
  decideRequest(
    id: string,
    decision: RequestDecisionInput
  ): Promise<ListingRequest> {
    return this.send("PATCH", `/requests/${id}`, decision);
  }

  /** Either party to an active claim; invalidates any previous code. */
  generatePickupCode(id: string): Promise<PickupCode> {
    return this.send("POST", `/requests/${id}/pickup-code`, {});
  }

  /** Must be called by the party that did not generate the code. */
  verifyPickupCode(id: string, verify: VerifyPickup): Promise<ListingRequest> {
    return this.send("POST", `/requests/${id}/verify`, verify);
  }
}

/** Flattens Nest's { statusCode, message, error } body into one string. */
async function errorDetail(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as {
    message?: string | string[];
    error?: string;
  };
  const message = Array.isArray(body.message)
    ? body.message.join(", ")
    : body.message;
  return message || body.error || res.statusText;
}
