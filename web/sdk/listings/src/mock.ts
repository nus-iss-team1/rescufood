// In-memory stand-in for the listings service, satisfying the same
// ListingsApi as the http client. State lives for the life of the process,
// so a request filed here shows up in later reads from the same instance.

import { ApiError } from "./client";
import { sampleListings, sampleRequests } from "./fixtures";
import type {
  Listing,
  ListingQuery,
  ListingRequest,
  ListingsApi,
  ListingStatus,
  ListingUpdate,
  NewListing,
  NewRequest,
  Paginated,
  PickupCode,
  RequestDecisionInput,
  RequestQuery,
  RequestStatus,
  VerifyPickup,
} from "./types";

// Mirrors the service's transition maps, so the ui hits the same rules.
const LISTING_TRANSITIONS: Record<ListingStatus, readonly ListingStatus[]> = {
  draft: ["available", "cancelled"],
  available: ["draft", "cancelled"],
  reserved: [],
  collected: [],
  expired: [],
  cancelled: [],
};

const REQUEST_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  active: ["cancelled", "no_show"],
  cancelled: [],
  completed: [],
  no_show: [],
  expired: [],
};

const now = () => new Date().toISOString();

function paginate<T>(items: T[], limit = 20, offset = 0): Paginated<T> {
  return { items: items.slice(offset, offset + limit), total: items.length };
}

function within(value: string, from?: string, to?: string) {
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

export class MockListingsClient implements ListingsApi {
  private listings: Listing[];
  private requests: ListingRequest[];

  constructor() {
    this.listings = sampleListings.map((l) => ({ ...l }));
    this.requests = sampleRequests.map((r) => ({ ...r }));
  }

  private listingOr404(id: string): Listing {
    const found = this.listings.find((l) => l.id === id && !l.deletedAt);
    if (!found) throw new ApiError(404, `listing ${id} not found`);
    return found;
  }

  private requestOr404(id: string): ListingRequest {
    const found = this.requests.find((r) => r.id === id);
    if (!found) throw new ApiError(404, `request ${id} not found`);
    return found;
  }

  async listListings(query: ListingQuery = {}): Promise<Paginated<Listing>> {
    let items = this.listings.filter((l) => !l.deletedAt);
    if (query.status) items = items.filter((l) => l.status === query.status);
    if (query.category)
      items = items.filter((l) => l.category === query.category);
    if (query.pickupLocation) {
      const needle = query.pickupLocation.toLowerCase();
      items = items.filter((l) =>
        (l.pickupLocation ?? "").toLowerCase().includes(needle)
      );
    }
    items = items.filter(
      (l) =>
        // "" sorts before any real date, so a null useBy is excluded by an
        // active from/to filter but doesn't affect the unfiltered case.
        within(l.useBy ?? "", query.useByFrom, query.useByTo) &&
        within(l.createdAt, query.createdAtFrom, query.createdAtTo)
    );

    const key = query.sortBy ?? "useBy";
    const dir = query.sortOrder === "desc" ? -1 : 1;
    items = [...items].sort((a, b) =>
      String(a[key]) < String(b[key]) ? -dir : String(a[key]) > String(b[key]) ? dir : 0
    );
    return paginate(items, query.limit, query.offset);
  }

  async getListing(id: string): Promise<Listing> {
    return this.listingOr404(id);
  }

  async createListing(listing: NewListing): Promise<Listing> {
    const stamp = now();
    const created: Listing = {
      id: crypto.randomUUID(),
      donorOrgId: sampleListings[0].donorOrgId,
      createdBy: sampleListings[0].createdBy,
      // NewListing's fields are all optional (a Draft can be incomplete) -
      // Listing's are all nullable, so an absent field becomes null here.
      category: listing.category ?? null,
      description: listing.description ?? null,
      quantity:
        listing.quantity != null
          ? listing.quantity.toFixed(2)
          : null,
      unit: listing.unit ?? null,
      allergens: listing.allergens ?? [],
      handlingInstructions: listing.handlingInstructions ?? "",
      useBy: listing.useBy ?? null,
      pickupLocation: listing.pickupLocation ?? null,
      pickupWindowStart: listing.pickupWindowStart ?? null,
      pickupWindowEnd: listing.pickupWindowEnd ?? null,
      // The service defaults new listings to draft; publishing is a
      // follow-up status change.
      status: "draft",
      version: 1,
      cancelledReason: "",
      createdAt: stamp,
      updatedAt: stamp,
      deletedAt: null,
      images: [],
    };
    this.listings.unshift(created);
    return created;
  }

  async updateListing(id: string, update: ListingUpdate): Promise<Listing> {
    const listing = this.listingOr404(id);
    if (listing.version !== update.version) {
      throw new ApiError(409, "listing was modified since it was read");
    }
    if (update.status && update.status !== listing.status) {
      if (!LISTING_TRANSITIONS[listing.status].includes(update.status)) {
        throw new ApiError(
          400,
          `cannot change listing status from ${listing.status} to ${update.status}`
        );
      }
      listing.status = update.status;
    }
    if (update.category !== undefined) listing.category = update.category;
    if (update.description !== undefined)
      listing.description = update.description;
    if (update.quantity !== undefined)
      listing.quantity = update.quantity.toFixed(2);
    if (update.unit !== undefined) listing.unit = update.unit;
    if (update.allergens !== undefined) listing.allergens = update.allergens;
    if (update.handlingInstructions !== undefined)
      listing.handlingInstructions = update.handlingInstructions;
    if (update.useBy !== undefined) listing.useBy = update.useBy;
    if (update.pickupLocation !== undefined)
      listing.pickupLocation = update.pickupLocation;
    if (update.pickupWindowStart !== undefined)
      listing.pickupWindowStart = update.pickupWindowStart;
    if (update.pickupWindowEnd !== undefined)
      listing.pickupWindowEnd = update.pickupWindowEnd;
    if (update.cancelledReason !== undefined)
      listing.cancelledReason = update.cancelledReason;

    listing.version += 1;
    listing.updatedAt = now();
    return listing;
  }

  async deleteListing(id: string): Promise<void> {
    this.listingOr404(id).deletedAt = now();
  }

  async listRequests(
    query: RequestQuery = {}
  ): Promise<Paginated<ListingRequest>> {
    let items = this.requests;
    if (query.status) items = items.filter((r) => r.status === query.status);
    if (query.listingId)
      items = items.filter((r) => r.listingId === query.listingId);

    const key = query.sortBy ?? "requestedAt";
    const dir = query.sortOrder === "asc" ? 1 : -1;
    items = [...items].sort((a, b) =>
      a[key] < b[key] ? -dir : a[key] > b[key] ? dir : 0
    );
    return paginate(items, query.limit, query.offset);
  }

  async getRequest(id: string): Promise<ListingRequest> {
    return this.requestOr404(id);
  }

  async createRequest(request: NewRequest): Promise<ListingRequest> {
    // Idempotent on the key, matching the service.
    const replay = this.requests.find(
      (r) => r.idempotencyKey === request.idempotencyKey
    );
    if (replay) return replay;

    const listing = this.listingOr404(request.listingId);
    if (listing.status !== "available") {
      throw new ApiError(409, `listing ${listing.id} has already been claimed`);
    }

    // First-come-first-served: the claim takes the whole lot and reserves
    // the listing.
    listing.status = "reserved";
    listing.version += 1;
    listing.updatedAt = now();

    const stamp = now();
    const created: ListingRequest = {
      id: crypto.randomUUID(),
      listingId: listing.id,
      rescueOrgId: sampleRequests[0].rescueOrgId,
      claimedBy: sampleRequests[0].claimedBy,
      idempotencyKey: request.idempotencyKey,
      status: "active",
      requestedQuantity: listing.quantity ?? "0.00",
      requestedAt: stamp,
      cancelledAt: null,
      cancellationReason: "",
      codeExpiresAt: null,
      codeGeneratedBy: null,
      verifiedBy: null,
      collectedQuantity: null,
      collectedAt: null,
      noShowReason: "",
      createdAt: stamp,
      updatedAt: stamp,
    };
    this.requests.unshift(created);
    return created;
  }

  async decideRequest(
    id: string,
    decision: RequestDecisionInput
  ): Promise<ListingRequest> {
    const request = this.requestOr404(id);
    if (!REQUEST_TRANSITIONS[request.status].includes(decision.status)) {
      throw new ApiError(
        400,
        `cannot change request status from ${request.status} to ${decision.status}`
      );
    }

    const wasActive = request.status === "active";
    request.status = decision.status;
    request.updatedAt = now();
    if (decision.status === "cancelled") {
      request.cancelledAt = now();
      request.cancellationReason = decision.cancellationReason ?? "";
    }
    if (decision.status === "no_show") {
      request.noShowReason = decision.noShowReason ?? "";
    }
    // Both outcomes reopen the listing for another org to claim.
    if (wasActive) {
      const listing = this.listings.find((l) => l.id === request.listingId);
      if (listing && listing.status === "reserved") {
        listing.status = "available";
        listing.version += 1;
        listing.updatedAt = now();
      }
    }
    return request;
  }

  async generatePickupCode(id: string): Promise<PickupCode> {
    const request = this.requestOr404(id);
    if (request.status !== "active") {
      throw new ApiError(400, "claim is not active");
    }
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
    request.codeExpiresAt = expiresAt;
    request.updatedAt = now();
    return { code: "123456", expiresAt };
  }

  async verifyPickupCode(
    id: string,
    verify: VerifyPickup
  ): Promise<ListingRequest> {
    const request = this.requestOr404(id);
    if (request.status !== "active") {
      throw new ApiError(409, "claim is no longer active");
    }
    if (verify.code !== "123456") {
      throw new ApiError(400, "invalid or expired code");
    }
    request.status = "completed";
    request.collectedQuantity = (
      verify.collectedQuantity ?? Number(request.requestedQuantity)
    ).toFixed(2);
    request.collectedAt = now();
    request.updatedAt = now();

    const listing = this.listings.find((l) => l.id === request.listingId);
    if (listing && listing.status === "reserved") {
      listing.status = "collected";
      listing.version += 1;
      listing.updatedAt = now();
    }
    return request;
  }
}
