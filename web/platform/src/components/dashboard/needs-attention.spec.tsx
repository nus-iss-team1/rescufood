import { render, screen, within } from "@testing-library/react";
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
    listingDescription: "Chilled yoghurt",
    listingUnit: "kg",
    requestedQuantity: "10",
    status: "active",
    requestedAt: "2025-06-14T09:00:00.000Z",
    createdAt: "2025-06-14T09:00:00.000Z",
    updatedAt: "2025-06-14T09:00:00.000Z",
    ...overrides,
  } as ListingRequest;
}

/** The table row carrying the given item text. */
function row(item: string): HTMLElement {
  return screen.getByRole("row", { name: new RegExp(item) });
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
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows a closing listing with its own status, not a derived label", () => {
    render(<NeedsAttention expiring={[listing()]} awaitingPickup={[]} />);

    expect(within(row("Fresh vegetables")).getByText("available")).toBeInTheDocument();
  });

  it("shows a claim with its own status", () => {
    render(<NeedsAttention expiring={[]} awaitingPickup={[request()]} />);

    expect(within(row("Chilled yoghurt")).getByText("Active")).toBeInTheDocument();
  });

  it("links a closing listing to the listing itself", () => {
    render(
      <NeedsAttention expiring={[listing({ id: "abc" })]} awaitingPickup={[]} />,
    );

    expect(
      screen.getByRole("link", { name: "Fresh vegetables" }),
    ).toHaveAttribute("href", "/listings/abc");
  });

  it("links a claim to its request", () => {
    render(
      <NeedsAttention
        expiring={[]}
        awaitingPickup={[request({ id: "req-9" })]}
      />,
    );

    expect(screen.getByRole("link", { name: "Chilled yoghurt" })).toHaveAttribute(
      "href",
      "/requests/req-9",
    );
  });

  it("puts the soonest deadline first, whatever order it is given", () => {
    render(
      <NeedsAttention
        expiring={[
          listing({ id: "later", description: "Later lot", pickupWindowEnd: inHours(9) }),
          listing({ id: "sooner", description: "Sooner lot", pickupWindowEnd: inHours(2) }),
        ]}
        awaitingPickup={[request()]}
      />,
    );

    // Row 0 is the header; claims carry no deadline so they sort last.
    const items = screen
      .getAllByRole("row")
      .slice(1)
      .map((r) => r.textContent ?? "");
    expect(items[0]).toContain("Sooner lot");
    expect(items[1]).toContain("Later lot");
    expect(items[2]).toContain("Chilled yoghurt");
  });

  it("caps the table and says how many it held back", () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      listing({ id: `l-${i}`, description: `Lot ${i}`, pickupWindowEnd: inHours(i + 1) }),
    );

    render(<NeedsAttention expiring={many} awaitingPickup={[request()]} />);

    expect(screen.getAllByRole("row")).toHaveLength(6); // header + 5
    expect(screen.getByText("1 more not shown.")).toBeInTheDocument();
  });

  it("says nothing about a remainder when everything fits", () => {
    render(<NeedsAttention expiring={[listing()]} awaitingPickup={[]} />);

    expect(screen.queryByText(/more not shown/)).toBeNull();
  });

  it("falls back to a dash when a listing has no pickup window", () => {
    render(
      <NeedsAttention
        expiring={[listing({ pickupWindowEnd: null })]}
        awaitingPickup={[]}
      />,
    );

    expect(within(row("Fresh vegetables")).getByText("—")).toBeInTheDocument();
  });
});
