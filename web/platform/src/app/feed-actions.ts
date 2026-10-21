"use server";

import type { ListingStatus, RequestStatus } from "@rescufood/listings-sdk";

import { getMe } from "@/lib/profile";
import {
  listListings,
  listRequests,
  type Listing,
  type ListingRequest,
} from "@/lib/listings";
import { PAGE_SIZE } from "@/lib/paging";
import { requireSession } from "@/lib/session";

/**
 * One page of the signed-in donor's listings. The organisation comes from
 * the session, not the caller.
 */
export async function loadListingsPage(
  status: ListingStatus | null,
  offset: number,
): Promise<Listing[]> {
  const session = await requireSession();
  if (!session.idToken) return [];

  const me = await getMe(session.idToken);
  if (!me.org) return [];

  const page = await listListings(session.idToken, {
    donorOrgName: me.org.name,
    status: status ?? undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
    limit: PAGE_SIZE,
    offset,
  });
  return page.items;
}

/** One page of the signed-in organisation's requests. */
export async function loadRequestsPage(
  status: RequestStatus | null,
  offset: number,
): Promise<ListingRequest[]> {
  const session = await requireSession();
  if (!session.idToken) return [];

  const page = await listRequests(session.idToken, {
    status: status ?? undefined,
    sortBy: "requestedAt",
    sortOrder: "desc",
    limit: PAGE_SIZE,
    offset,
  });
  return page.items;
}
