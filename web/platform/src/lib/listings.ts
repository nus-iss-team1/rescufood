import "server-only";

import {
  ApiError,
  createListingsClient,
  type ListingsApi,
  type Listing,
  type ListingQuery,
  type ListingRequest,
  type ListingUpdate,
  type NewListing,
  type NewRequest,
  type Paginated,
  type PickupCode,
  type RequestDecisionInput,
  type RequestQuery,
  type VerifyPickup,
} from "@rescufood/listings-sdk";

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
  Paginated,
  PickupCode,
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
): Promise<PickupCode> {
  return client(idToken).generatePickupCode(id);
}

export function verifyPickupCode(
  idToken: string,
  id: string,
  verify: VerifyPickup,
): Promise<ListingRequest> {
  return client(idToken).verifyPickupCode(id, verify);
}
