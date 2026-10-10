import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Listing, ListingRequest } from "@rescufood/listings-sdk";
import { NeedsAttention } from "./needs-attention";

const NOW = new Date("2025-06-15T12:00:00.000Z");

/** Hours from NOW, as an ISO string. */
function inHours(hours: number): string {
  return new Date(NOW.getTime() + hours * 3_600_000).toISOString();
}

function listing(overrides: Partial<Listing> = {}): Listing {
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
    pickupWindowStart: inHours(1),
    pickupWindowEnd: inHours(5),
    status: "available",
    version: 1,
    cancelledReason: "",
    createdAt: "2025-06-14T00:00:00.000Z",
    updatedAt: "2025-06-14T00:00:00.000Z",
    publishedAt: null,
    deletedAt: null,
    images: [],
    ...overrides,
  };
}

function request(overrides: Partial<ListingRequest> = {}): ListingRequest {
  return {
    id: "request-1",
    listingId: "listing-1",
    listingDescription: "Fresh vegetables",
    listingUnit: "kg",
    requestedQuantity: "10",
    status: "active",
    createdAt: "2025-06-14T00:00:00.000Z",
    updatedAt: "2025-06-14T00:00:00.000Z",
    ...overrides,
  } as ListingRequest;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("NeedsAttention", () => {
  it("settles to a calm state when nothing is outstanding", () => {
    render(<NeedsAttention expiring={[]} awaitingPickup={[]} />);

    expect(screen.getByText("Nothing needs you right now.")).toBeInTheDocument();
  });

  it("counts both kinds of outstanding item", () => {
    render(
      <NeedsAttention
        expiring={[listing(), listing({ id: "listing-2" })]}
        awaitingPickup={[request()]}
      />,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("says how long a closing pickup window has left", () => {
    render(
      <NeedsAttention
        expiring={[listing({ pickupWindowEnd: inHours(5) })]}
        awaitingPickup={[]}
      />,
    );

    expect(screen.getByText("closes in 5 hours")).toBeInTheDocument();
  });

  it("uses the singular for the final hour", () => {
    render(
      <NeedsAttention
        expiring={[listing({ pickupWindowEnd: inHours(1) })]}
        awaitingPickup={[]}
      />,
    );

    expect(screen.getByText("closes in 1 hour")).toBeInTheDocument();
  });

  it("reports a window that has already closed", () => {
    render(
      <NeedsAttention
        expiring={[listing({ pickupWindowEnd: inHours(-2) })]}
        awaitingPickup={[]}
      />,
    );

    expect(screen.getByText("pickup window has closed")).toBeInTheDocument();
  });

  it("links a closing listing to the listing itself", () => {
    render(
      <NeedsAttention
        expiring={[listing({ id: "abc" })]}
        awaitingPickup={[]}
      />,
    );

    expect(screen.getByRole("link", { name: /Fresh vegetables/ })).toHaveAttribute(
      "href",
      "/listings/abc",
    );
  });

  it("links a claim awaiting verification to the request", () => {
    render(
      <NeedsAttention
        expiring={[]}
        awaitingPickup={[request({ id: "req-9" })]}
      />,
    );

    const link = screen.getByRole("link", { name: /Fresh vegetables/ });
    expect(link).toHaveAttribute("href", "/requests/req-9");
    expect(link).toHaveTextContent("waiting on pickup verification");
  });
});
