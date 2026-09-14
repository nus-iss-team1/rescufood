import dayjs from "dayjs";
import type { Listing } from "@rescufood/listings-sdk";

export interface ListingFilterParams {
  area?: string;
  category?: string;
  minQty?: string | number;
  pickupWindow?: string;
  pickupBefore?: string;
}

/**
 * Determines whether any filter criteria are currently active.
 */
export function isFilterActive(filters: ListingFilterParams): boolean {
  const hasArea = Boolean(filters.area && filters.area.trim() !== "");
  const hasCategory = Boolean(
    filters.category &&
      filters.category !== "all" &&
      filters.category.trim() !== "",
  );
  const hasMinQty = Boolean(
    filters.minQty !== undefined &&
      filters.minQty !== null &&
      String(filters.minQty).trim() !== "" &&
      Number(filters.minQty) > 0,
  );
  const hasPickupWindow = Boolean(
    filters.pickupWindow &&
      filters.pickupWindow !== "all" &&
      filters.pickupWindow.trim() !== "",
  );
  const hasPickupBefore = Boolean(
    filters.pickupBefore && filters.pickupBefore.trim() !== "",
  );

  return (
    hasArea ||
    hasCategory ||
    hasMinQty ||
    hasPickupWindow ||
    hasPickupBefore
  );
}

/**
 * Filters listings according to user criteria.
 *
 * Strict Status Gating: Only listings with status === 'available' are returned,
 * regardless of which filters are applied or if all filters are cleared.
 */
export function filterListings(
  listings: Listing[],
  filters: ListingFilterParams = {},
  referenceDate?: Date | string,
): Listing[] {
  const now = referenceDate ? dayjs(referenceDate) : dayjs();

  return listings.filter((listing) => {
    // 1. Strict status gating: only 'available' listings
    if (listing.status !== "available") {
      return false;
    }

    // 2. Pickup Area (case-insensitive substring match on pickupLocation)
    if (filters.area && filters.area.trim() !== "") {
      const needle = filters.area.trim().toLowerCase();
      const location = (listing.pickupLocation || "").toLowerCase();
      if (!location.includes(needle)) {
        return false;
      }
    }

    // 3. Category match
    if (
      filters.category &&
      filters.category !== "all" &&
      filters.category.trim() !== ""
    ) {
      if (listing.category !== filters.category) {
        return false;
      }
    }

    // 4. Minimum quantity match (quantity >= minQty)
    if (
      filters.minQty !== undefined &&
      filters.minQty !== null &&
      String(filters.minQty).trim() !== ""
    ) {
      const min = Number(filters.minQty);
      if (!Number.isNaN(min) && min > 0) {
        // Non-null: the status gate above already confirmed 'available'.
        const remaining = parseFloat(listing.quantity!);
        if (Number.isNaN(remaining) || remaining < min) {
          return false;
        }
      }
    }

    // 5. Pickup window preset match
    if (filters.pickupWindow && filters.pickupWindow !== "all") {
      const windowStart = dayjs(listing.pickupWindowStart);
      const windowEnd = dayjs(listing.pickupWindowEnd);

      if (!windowStart.isValid() || !windowEnd.isValid()) {
        return false;
      }

      if (filters.pickupWindow === "today") {
        const startOfToday = now.startOf("day");
        const endOfToday = now.endOf("day");
        // Window overlaps with today and ends at or after start of today
        const overlapsToday =
          (windowStart.isBefore(endOfToday) || windowStart.isSame(endOfToday)) &&
          (windowEnd.isAfter(startOfToday) || windowEnd.isSame(startOfToday));
        if (!overlapsToday) {
          return false;
        }
      } else if (filters.pickupWindow === "24h") {
        const limit24h = now.add(24, "hour");
        const within24h =
          windowStart.isBefore(limit24h) &&
          (windowEnd.isAfter(now) || windowEnd.isSame(now));
        if (!within24h) {
          return false;
        }
      } else if (filters.pickupWindow === "48h") {
        const limit48h = now.add(48, "hour");
        const within48h =
          windowStart.isBefore(limit48h) &&
          (windowEnd.isAfter(now) || windowEnd.isSame(now));
        if (!within48h) {
          return false;
        }
      }
    }

    // 6. Custom pickupBefore validation
    if (filters.pickupBefore && filters.pickupBefore.trim() !== "") {
      const target = dayjs(filters.pickupBefore);
      const windowStart = dayjs(listing.pickupWindowStart);
      if (target.isValid() && windowStart.isValid()) {
        if (!windowStart.isBefore(target)) {
          return false;
        }
      }
    }

    return true;
  });
}
