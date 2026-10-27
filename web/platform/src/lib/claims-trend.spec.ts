import { describe, expect, it } from "vitest";
import type { ListingRequest } from "@rescufood/listings-sdk";
import { toTrend } from "./claims-trend";

function claimedAt(requestedAt: string): ListingRequest {
  return { requestedAt } as ListingRequest;
}

describe("toTrend", () => {
  it("is empty when there are no claims", () => {
    expect(toTrend([])).toEqual([]);
  });

  it("counts claims per day", () => {
    expect(
      toTrend([
        claimedAt("2025-06-14T09:00:00.000Z"),
        claimedAt("2025-06-14T17:30:00.000Z"),
        claimedAt("2025-06-15T08:00:00.000Z"),
      ]),
    ).toEqual([
      { day: "2025-06-14", count: 2 },
      { day: "2025-06-15", count: 1 },
    ]);
  });

  it("fills days without claims with zeros, in date order", () => {
    expect(
      toTrend([
        claimedAt("2025-06-17T10:00:00.000Z"),
        claimedAt("2025-06-14T10:00:00.000Z"),
      ]),
    ).toEqual([
      { day: "2025-06-14", count: 1 },
      { day: "2025-06-15", count: 0 },
      { day: "2025-06-16", count: 0 },
      { day: "2025-06-17", count: 1 },
    ]);
  });
});
