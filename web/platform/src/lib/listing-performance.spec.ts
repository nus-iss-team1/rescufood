import { describe, expect, it } from "vitest";
import type { ListingRequest } from "@rescufood/listings-sdk";
import { toPerformance } from "./listing-performance";

function request(overrides: Partial<ListingRequest> = {}): ListingRequest {
  return {
    listingId: "listing-1",
    listingDescription: "Chilled yoghurt",
    listingUnit: "kg",
    status: "active",
    collectedQuantity: null,
    ...overrides,
  } as ListingRequest;
}

describe("toPerformance", () => {
  it("groups claims by listing and tallies their outcomes", () => {
    const [row] = toPerformance([
      request({ status: "completed", collectedQuantity: "4" }),
      request({ status: "completed", collectedQuantity: "2.5" }),
      request({ status: "no_show" }),
      request({ status: "cancelled" }),
    ]);

    expect(row).toEqual({
      listingId: "listing-1",
      description: "Chilled yoghurt",
      claims: 4,
      completed: 2,
      noShow: 1,
      collected: 6.5,
      unit: "kg",
    });
  });

  it("leaves collected null when nothing was collected", () => {
    const [row] = toPerformance([request({ status: "no_show" })]);
    expect(row.collected).toBeNull();
  });

  it("falls back when the listing has no description or unit", () => {
    const [row] = toPerformance([
      request({ listingDescription: undefined, listingUnit: undefined }),
    ]);
    expect(row.description).toBe("—");
    expect(row.unit).toBe("");
  });

  it("sorts by claims, then by completed claims", () => {
    const rows = toPerformance([
      request({ listingId: "few" }),
      request({ listingId: "many" }),
      request({ listingId: "many" }),
      request({ listingId: "tied", status: "completed" }),
      request({ listingId: "tied" }),
    ]);

    expect(rows.map((row) => row.listingId)).toEqual(["tied", "many", "few"]);
  });
});
