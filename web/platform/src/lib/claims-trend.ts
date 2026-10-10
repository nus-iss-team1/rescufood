import type { ListingRequest } from "@rescufood/listings-sdk";

export interface TrendPoint {
  /** YYYY-MM-DD, one per day across the whole span. */
  day: string;
  count: number;
}

function toDayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * Claims per day across the span the given requests cover. Days with no
 * claims are zeros rather than missing points, so the line cannot imply a
 * gap was activity.
 */
export function toTrend(requests: ListingRequest[]): TrendPoint[] {
  if (requests.length === 0) return [];

  const counts = new Map<string, number>();
  for (const request of requests) {
    const key = toDayKey(request.requestedAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const keys = [...counts.keys()].sort();
  const first = new Date(`${keys[0]}T00:00:00Z`);
  const last = new Date(`${keys[keys.length - 1]}T00:00:00Z`);

  const points: TrendPoint[] = [];
  // Copy: the cursor is mutated each step, which would consume `first`.
  for (
    const at = new Date(first);
    at <= last;
    at.setUTCDate(at.getUTCDate() + 1)
  ) {
    points.push({
      day: at.toISOString().slice(0, 10),
      count: counts.get(at.toISOString().slice(0, 10)) ?? 0,
    });
  }
  return points;
}
