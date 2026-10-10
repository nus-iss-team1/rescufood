import type { ListingRequest } from "@rescufood/listings-sdk";

export interface ListingPerformanceRow {
  listingId: string;
  description: string;
  claims: number;
  completed: number;
  noShow: number;
  /** Null when nothing was ever collected, so it reads "—" not "0". */
  collected: number | null;
  unit: string;
}

/**
 * Claims grouped by the lot they were made against. Quantities are summed
 * only within a listing, where the unit is constant, never across them.
 */
export function toPerformance(
  requests: ListingRequest[],
): ListingPerformanceRow[] {
  const byListing = new Map<string, ListingPerformanceRow>();

  for (const request of requests) {
    const row = byListing.get(request.listingId) ?? {
      listingId: request.listingId,
      description: request.listingDescription ?? "—",
      claims: 0,
      completed: 0,
      noShow: 0,
      collected: null,
      unit: request.listingUnit ?? "",
    };

    row.claims += 1;
    if (request.status === "completed") row.completed += 1;
    if (request.status === "no_show") row.noShow += 1;

    const collected = Number(request.collectedQuantity ?? "");
    if (Number.isFinite(collected) && request.collectedQuantity !== null) {
      row.collected = (row.collected ?? 0) + collected;
    }

    byListing.set(request.listingId, row);
  }

  return [...byListing.values()].sort(
    (a, b) => b.claims - a.claims || b.completed - a.completed,
  );
}
