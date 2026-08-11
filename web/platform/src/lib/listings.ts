import "server-only";

import {
  ApiError,
  ListingsClient,
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

function client(idToken: string) {
  return new ListingsClient({ baseUrl: base, getToken: () => idToken });
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
  query: ListingQuery = {}
): Promise<Paginated<Listing>> {
  return client(idToken).listListings(query);
}

export function getListing(idToken: string, id: string): Promise<Listing> {
  return client(idToken).getListing(id);
}

export function createListing(
  idToken: string,
  listing: NewListing,
  images: Blob[] = []
): Promise<Listing> {
  return client(idToken).createListing(listing, images);
}

export function updateListing(
  idToken: string,
  id: string,
  update: ListingUpdate,
  images: Blob[] = []
): Promise<Listing> {
  return client(idToken).updateListing(id, update, images);
}

export function deleteListing(idToken: string, id: string): Promise<void> {
  return client(idToken).deleteListing(id);
}

export function listRequests(
  idToken: string,
  query: RequestQuery = {}
): Promise<Paginated<ListingRequest>> {
  return client(idToken).listRequests(query);
}

export function getRequest(
  idToken: string,
  id: string
): Promise<ListingRequest> {
  return client(idToken).getRequest(id);
}

export function createRequest(
  idToken: string,
  request: NewRequest
): Promise<ListingRequest> {
  return client(idToken).createRequest(request);
}

export function decideRequest(
  idToken: string,
  id: string,
  decision: RequestDecisionInput
): Promise<ListingRequest> {
  return client(idToken).decideRequest(id, decision);
}

export function generatePickupCode(
  idToken: string,
  id: string
): Promise<PickupCode> {
  return client(idToken).generatePickupCode(id);
}

export function verifyPickupCode(
  idToken: string,
  id: string,
  verify: VerifyPickup
): Promise<ListingRequest> {
  return client(idToken).verifyPickupCode(id, verify);
}
