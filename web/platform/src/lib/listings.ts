import "server-only";

import {
  ApiError,
  createListingsClient,
  type ListingsApi,
  type OrgSummary,
  type RescuedMetrics,
  type UnitQuantity,
  type Listing,
  type ListingQuery,
  type ListingRequest,
  type ListingUpdate,
  type NewListing,
  type NewRequest,
  type Paginated,
  type PickupCode,
  type PickupCodeMatch,
  type RequestDecisionInput,
  type RequestQuery,
  type VerifyPickup,
} from "@rescufood/listings-sdk";
import { formatDuration } from "@/lib/format-duration";

const base = process.env.LISTINGS_API_URL ?? "http://localhost:3002";

// The listings service is not deployed yet, so every call is served by
// the sdk's stand-in. Flip to false once it ships and LISTINGS_API_URL
// points at it.
const mock: boolean = false;

// One store for the process, so a request filed on one page is there on
// the next. Real clients are per-call because they carry the caller's token.
let mockClient: ListingsApi | undefined;

function client(idToken: string) {
  if (mock) {
    mockClient ??= createListingsClient({ baseUrl: base, mock: true });
    return mockClient;
  }
  return createListingsClient({ baseUrl: base, getToken: () => idToken });
}

export { ApiError as ListingsApiError };
export type {
  Listing,
  ListingQuery,
  ListingRequest,
  ListingUpdate,
  NewListing,
  NewRequest,
  OrgSummary,
  RescuedMetrics,
  UnitQuantity,
  Paginated,
  PickupCode,
  PickupCodeMatch,
  RequestDecisionInput,
  RequestQuery,
  VerifyPickup,
};

export function listListings(
  idToken: string,
  query: ListingQuery = {},
): Promise<Paginated<Listing>> {
  return client(idToken).listListings(query);
}

export function getListing(idToken: string, id: string): Promise<Listing> {
  return client(idToken).getListing(id);
}

export function createListing(
  idToken: string,
  listing: NewListing,
  images: Blob[] = [],
): Promise<Listing> {
  return client(idToken).createListing(listing, images);
}

export function updateListing(
  idToken: string,
  id: string,
  update: ListingUpdate,
  images: Blob[] = [],
): Promise<Listing> {
  return client(idToken).updateListing(id, update, images);
}

export function deleteListing(idToken: string, id: string): Promise<void> {
  return client(idToken).deleteListing(id);
}

export function listRequests(
  idToken: string,
  query: RequestQuery = {},
): Promise<Paginated<ListingRequest>> {
  return client(idToken).listRequests(query);
}

export function getRequest(
  idToken: string,
  id: string,
): Promise<ListingRequest> {
  return client(idToken).getRequest(id);
}

export function createRequest(
  idToken: string,
  request: NewRequest,
): Promise<ListingRequest> {
  return client(idToken).createRequest(request);
}

export function decideRequest(
  idToken: string,
  id: string,
  decision: RequestDecisionInput,
): Promise<ListingRequest> {
  return client(idToken).decideRequest(id, decision);
}

export function generatePickupCode(
  idToken: string,
  id: string,
  regenerate = false,
): Promise<PickupCode> {
  return client(idToken).generatePickupCode(id, regenerate);
}

export function lookupPickupCode(
  idToken: string,
  code: string,
): Promise<PickupCodeMatch> {
  return client(idToken).lookupPickupCode(code);
}

export function verifyPickupCode(
  idToken: string,
  id: string,
  verify: VerifyPickup,
): Promise<ListingRequest> {
  return client(idToken).verifyPickupCode(id, verify);
}

export function getOrgSummary(idToken: string): Promise<OrgSummary> {
  return client(idToken).getOrgSummary();
}

export async function getRescuedMetrics(
  idToken: string,
): Promise<RescuedMetrics> {
  const c = client(idToken);
  try {
    return await c.getRescuedMetrics();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // Backend dedicated reporting endpoint not yet deployed; compute from requests & listings
      return await computeRescuedMetrics(idToken);
    }
    throw err;
  }
}

async function computeRescuedMetrics(idToken: string): Promise<RescuedMetrics> {
  const c = client(idToken);

  // Fetch listings across pages (up to 500)
  const allListings: Listing[] = [];
  let listingOffset = 0;
  while (true) {
    const page = await c.listListings({
      limit: 100,
      offset: listingOffset,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    allListings.push(...page.items);
    if (allListings.length >= page.total || page.items.length === 0) break;
    listingOffset += 100;
    if (listingOffset >= 500) break;
  }
  const listingMap = new Map<string, Listing>(allListings.map((l) => [l.id, l]));

  // Fetch requests across pages (up to 500)
  const allRequests: ListingRequest[] = [];
  let requestOffset = 0;
  while (true) {
    const page = await c.listRequests({
      limit: 100,
      offset: requestOffset,
      sortBy: "requestedAt",
      sortOrder: "desc",
    });
    allRequests.push(...page.items);
    if (allRequests.length >= page.total || page.items.length === 0) break;
    requestOffset += 100;
    if (requestOffset >= 500) break;
  }

  // Pre-fetch listings needed by requests that were not returned in the initial search
  // (e.g. for rescue partners, completed/reserved listings owned by donor orgs are not returned by listListings)
  const missingListingIds = Array.from(
    new Set(
      allRequests
        .map((r) => r.listingId)
        .filter((id) => id && !listingMap.has(id)),
    ),
  );
  if (missingListingIds.length > 0) {
    const batchSize = 10;
    for (let i = 0; i < missingListingIds.length; i += batchSize) {
      const batch = missingListingIds.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (id) => {
          try {
            const listing = await c.getListing(id);
            listingMap.set(id, listing);
          } catch {
            // listing could be deleted or forbidden
          }
        }),
      );
    }
  }

  // Multi-unit grouping for completed rescues
  const unitTotals = new Map<string, number>();
  let collectedCount = 0;
  const collectedListingIds = new Set<string>();

  const completedRequests = allRequests.filter((r) => r.status === "completed");
  for (const r of completedRequests) {
    collectedListingIds.add(r.listingId);
    collectedCount++;
    const listing = listingMap.get(r.listingId);
    const unit = listing?.unit?.trim() || "units";
    const qty = r.collectedQuantity
      ? parseFloat(r.collectedQuantity)
      : listing?.quantity
      ? parseFloat(listing.quantity)
      : 0;
    unitTotals.set(unit, (unitTotals.get(unit) ?? 0) + (isNaN(qty) ? 0 : qty));
  }

  // Also include listings with status 'collected' not accounted for by completedRequests
  const collectedListings = allListings.filter(
    (l) => l.status === "collected" && !l.deletedAt && !collectedListingIds.has(l.id),
  );
  for (const l of collectedListings) {
    collectedCount++;
    const unit = l.unit?.trim() || "units";
    const qty = l.quantity ? parseFloat(l.quantity) : 0;
    unitTotals.set(unit, (unitTotals.get(unit) ?? 0) + (isNaN(qty) ? 0 : qty));
  }

  const rescuedByUnit: UnitQuantity[] = Array.from(unitTotals.entries()).map(
    ([unit, amount]) => ({
      unit,
      amount,
      formatted: `${amount % 1 === 0 ? amount : amount.toFixed(1)} ${unit}`,
    }),
  );

  // Time-to-claim: elapsed time from publication (listing.createdAt) to claim acceptance (request.requestedAt)
  const durations: number[] = [];
  for (const r of allRequests) {
    const listing = listingMap.get(r.listingId);
    if (listing?.createdAt && r.requestedAt) {
      const pubTime = new Date(listing.createdAt).getTime();
      const claimTime = new Date(r.requestedAt).getTime();
      const diffMs = claimTime - pubTime;
      if (!isNaN(diffMs) && diffMs >= 0) {
        durations.push(diffMs);
      }
    }
  }

  durations.sort((a, b) => a - b);
  const timeToClaimCount = durations.length;
  let avgTimeToClaimMs: number | null = null;
  let medianTimeToClaimMs: number | null = null;

  if (timeToClaimCount > 0) {
    avgTimeToClaimMs =
      durations.reduce((sum, d) => sum + d, 0) / timeToClaimCount;
    const mid = Math.floor(timeToClaimCount / 2);
    medianTimeToClaimMs =
      timeToClaimCount % 2 === 1
        ? durations[mid]
        : (durations[mid - 1] + durations[mid]) / 2;
  }

  return {
    orgId: "org",
    rescuedByUnit,
    collectedCount,
    avgTimeToClaimMs,
    medianTimeToClaimMs,
    formattedAvgTimeToClaim: formatDuration(avgTimeToClaimMs),
    formattedMedianTimeToClaim: formatDuration(medianTimeToClaimMs),
    timeToClaimCount,
    asOf: new Date().toISOString(),
  };
}

