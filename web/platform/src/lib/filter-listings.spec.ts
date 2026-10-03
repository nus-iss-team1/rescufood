import { describe, expect, it } from "vitest";
import type { Listing } from "@rescufood/listings-sdk";
import { filterListings, isFilterActive } from "./filter-listings";

const REFERENCE = "2025-06-15T00:00:00.000Z";

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    donorOrgId: "org-1",
    createdBy: "user-1",
    category: "produce",
    description: "Fresh vegetables",
    quantity: "10",
    unit: "kg",
    allergens: [],
    handlingInstructions: "",
    useBy: null,
    pickupLocation: "Tampines Hub",
    pickupWindowStart: "2025-06-15T02:00:00.000Z",
    pickupWindowEnd: "2025-06-15T06:00:00.000Z",
    status: "available",
    version: 1,
    cancelledReason: "",
    createdAt: "2025-06-14T00:00:00.000Z",
    updatedAt: "2025-06-14T00:00:00.000Z",
    deletedAt: null,
    images: [],
    ...overrides,
  };
}

describe("isFilterActive", () => {
  it("is false when no filters are set", () => {
    expect(isFilterActive({})).toBe(false);
  });

  it("is false when category is the 'all' sentinel", () => {
    expect(isFilterActive({ category: "all" })).toBe(false);
  });

  it("is false when minQty is zero or blank", () => {
    expect(isFilterActive({ minQty: 0 })).toBe(false);
    expect(isFilterActive({ minQty: "" })).toBe(false);
  });

  it("is true when any real filter is set", () => {
    expect(isFilterActive({ area: "Tampines" })).toBe(true);
    expect(isFilterActive({ category: "produce" })).toBe(true);
    expect(isFilterActive({ minQty: 5 })).toBe(true);
    expect(isFilterActive({ pickupWindow: "today" })).toBe(true);
    expect(isFilterActive({ pickupBefore: "2025-06-16T00:00:00.000Z" })).toBe(
      true,
    );
  });
});

describe("filterListings", () => {
  it("excludes listings that are not available, regardless of filters", () => {
    const listings = [makeListing({ status: "draft" })];
    expect(filterListings(listings, {}, REFERENCE)).toEqual([]);
  });

  it("returns every available listing when no filters are set", () => {
    const listings = [makeListing()];
    expect(filterListings(listings, {}, REFERENCE)).toEqual(listings);
  });

  it("matches pickup area case-insensitively as a substring", () => {
    const listings = [makeListing({ pickupLocation: "Tampines Hub" })];
    expect(
      filterListings(listings, { area: "tampines" }, REFERENCE),
    ).toEqual(listings);
    expect(
      filterListings(listings, { area: "jurong" }, REFERENCE),
    ).toEqual([]);
  });

  it("matches by category", () => {
    const listings = [makeListing({ category: "bakery" })];
    expect(
      filterListings(listings, { category: "bakery" }, REFERENCE),
    ).toEqual(listings);
    expect(
      filterListings(listings, { category: "dairy" }, REFERENCE),
    ).toEqual([]);
  });

  it("keeps listings whose quantity meets the minimum", () => {
    const listings = [makeListing({ quantity: "10" })];
    expect(filterListings(listings, { minQty: 5 }, REFERENCE)).toEqual(
      listings,
    );
    expect(filterListings(listings, { minQty: 20 }, REFERENCE)).toEqual([]);
  });

  it("keeps listings whose pickup window overlaps today", () => {
    const listings = [
      makeListing({
        pickupWindowStart: "2025-06-15T02:00:00.000Z",
        pickupWindowEnd: "2025-06-15T06:00:00.000Z",
      }),
    ];
    expect(
      filterListings(listings, { pickupWindow: "today" }, REFERENCE),
    ).toEqual(listings);
  });

  it("excludes listings outside today's window", () => {
    const listings = [
      makeListing({
        pickupWindowStart: "2025-06-17T02:00:00.000Z",
        pickupWindowEnd: "2025-06-17T06:00:00.000Z",
      }),
    ];
    expect(
      filterListings(listings, { pickupWindow: "today" }, REFERENCE),
    ).toEqual([]);
  });

  it("keeps listings starting within the next 24 hours", () => {
    const listings = [
      makeListing({
        pickupWindowStart: "2025-06-15T12:00:00.000Z",
        pickupWindowEnd: "2025-06-15T14:00:00.000Z",
      }),
    ];
    expect(
      filterListings(listings, { pickupWindow: "24h" }, REFERENCE),
    ).toEqual(listings);
  });

  it("excludes listings starting after the next 24 hours", () => {
    const listings = [
      makeListing({
        pickupWindowStart: "2025-06-17T00:00:00.000Z",
        pickupWindowEnd: "2025-06-17T02:00:00.000Z",
      }),
    ];
    expect(
      filterListings(listings, { pickupWindow: "24h" }, REFERENCE),
    ).toEqual([]);
  });

  it("keeps listings starting within the next 48 hours", () => {
    const listings = [
      makeListing({
        pickupWindowStart: "2025-06-16T12:00:00.000Z",
        pickupWindowEnd: "2025-06-16T14:00:00.000Z",
      }),
    ];
    expect(
      filterListings(listings, { pickupWindow: "48h" }, REFERENCE),
    ).toEqual(listings);
  });

  it("excludes listings with an invalid pickup window", () => {
    const listings = [
      makeListing({ pickupWindowStart: null, pickupWindowEnd: null }),
    ];
    expect(
      filterListings(listings, { pickupWindow: "today" }, REFERENCE),
    ).toEqual([]);
  });

  it("keeps listings starting before a custom pickupBefore cutoff", () => {
    const listings = [
      makeListing({ pickupWindowStart: "2025-06-15T02:00:00.000Z" }),
    ];
    expect(
      filterListings(
        listings,
        { pickupBefore: "2025-06-16T00:00:00.000Z" },
        REFERENCE,
      ),
    ).toEqual(listings);
  });

  it("excludes listings starting at or after a custom pickupBefore cutoff", () => {
    const listings = [
      makeListing({ pickupWindowStart: "2025-06-17T02:00:00.000Z" }),
    ];
    expect(
      filterListings(
        listings,
        { pickupBefore: "2025-06-16T00:00:00.000Z" },
        REFERENCE,
      ),
    ).toEqual([]);
  });

  it("combines multiple filters with AND semantics", () => {
    const listings = [
      makeListing({ category: "produce", quantity: "10" }),
      makeListing({ id: "listing-2", category: "bakery", quantity: "10" }),
    ];
    expect(
      filterListings(
        listings,
        { category: "produce", minQty: 5 },
        REFERENCE,
      ),
    ).toEqual([listings[0]]);
  });
});
