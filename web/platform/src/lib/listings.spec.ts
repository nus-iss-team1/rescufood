// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Listing,
  ListingRequest,
  ListingsClientOptions,
} from "@rescufood/listings-sdk";
import { getRescuedMetrics, listListings, ListingsApiError } from "./listings";

const { apiMock, createListingsClientMock } = vi.hoisted(() => {
  const apiMock = {
    listListings: vi.fn(),
    listRequests: vi.fn(),
    getListing: vi.fn(),
    getRescuedMetrics: vi.fn(),
  };
  return {
    apiMock,
    createListingsClientMock: vi.fn(
      (_opts: ListingsClientOptions & { mock?: boolean }) => apiMock,
    ),
  };
});

vi.mock("@rescufood/listings-sdk", () => ({
  ApiError: class ApiError extends Error {
    constructor(
      readonly status: number,
      detail: string,
    ) {
      super(detail);
    }
  },
  createListingsClient: createListingsClientMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("client construction", () => {
  it("builds a real client with the caller's token, not the mock", async () => {
    apiMock.listListings.mockResolvedValue({ items: [], total: 0 });

    await listListings("token-1");

    const opts = createListingsClientMock.mock.calls[0][0];
    expect(opts.mock).toBeUndefined();
    expect(opts.baseUrl).toBe("http://localhost:3002");
    expect(opts.getToken!()).toBe("token-1");
  });
});

describe("getRescuedMetrics", () => {
  const T0 = "2025-06-15T00:00:00.000Z";
  const minutesAfterT0 = (m: number) =>
    new Date(Date.parse(T0) + m * 60_000).toISOString();

  function listing(overrides: Partial<Listing> & { id: string }): Listing {
    return {
      status: "available",
      unit: "kg",
      quantity: "1",
      createdAt: T0,
      deletedAt: null,
      ...overrides,
    } as Listing;
  }

  function request(
    overrides: Partial<ListingRequest> & { listingId: string },
  ): ListingRequest {
    return {
      id: `req-${overrides.listingId}`,
      status: "active",
      collectedQuantity: null,
      requestedAt: T0,
      ...overrides,
    } as ListingRequest;
  }

  const page = <T,>(items: T[], total = items.length) => ({ items, total });

  /** The dedicated endpoint isn't deployed, so the client computes it. */
  function fallbackWith(listings: Listing[], requests: ListingRequest[]) {
    apiMock.getRescuedMetrics.mockRejectedValue(
      new ListingsApiError(404, "not found"),
    );
    apiMock.listListings.mockResolvedValue(page(listings));
    apiMock.listRequests.mockResolvedValue(page(requests));
  }

  it("returns the service's metrics when the endpoint exists", async () => {
    const metrics = { collectedCount: 9 };
    apiMock.getRescuedMetrics.mockResolvedValue(metrics);

    await expect(getRescuedMetrics("token-1")).resolves.toBe(metrics);
    expect(apiMock.listListings).not.toHaveBeenCalled();
  });

  it("rethrows errors other than a missing endpoint", async () => {
    const err = new ListingsApiError(500, "boom");
    apiMock.getRescuedMetrics.mockRejectedValue(err);

    await expect(getRescuedMetrics("token-1")).rejects.toBe(err);
    expect(apiMock.listListings).not.toHaveBeenCalled();
  });

  it("reports empty metrics when nothing has been rescued", async () => {
    fallbackWith([], []);

    await expect(getRescuedMetrics("token-1")).resolves.toMatchObject({
      rescuedByUnit: [],
      collectedCount: 0,
      avgTimeToClaimMs: null,
      medianTimeToClaimMs: null,
      formattedAvgTimeToClaim: "--",
      timeToClaimCount: 0,
    });
  });

  it("totals completed claims per unit, never summing across units", async () => {
    fallbackWith(
      [
        listing({ id: "L1", unit: "kg", quantity: "10" }),
        listing({ id: "L2", unit: "kg", quantity: "2.5" }),
        listing({ id: "L3", unit: "meals", quantity: "4", status: "collected" }),
      ],
      [
        // Collected quantity wins over the listed quantity...
        request({ listingId: "L1", status: "completed", collectedQuantity: "7.5" }),
        // ...and the listed quantity is the fallback when none was recorded.
        request({ listingId: "L2", status: "completed" }),
        // Not completed, so not rescued.
        request({ listingId: "L1", id: "req-active", status: "active" }),
      ],
    );

    const metrics = await getRescuedMetrics("token-1");

    expect(metrics.collectedCount).toBe(3);
    expect(metrics.rescuedByUnit).toEqual([
      { unit: "kg", amount: 10, formatted: "10 kg" },
      { unit: "meals", amount: 4, formatted: "4 meals" },
    ]);
  });

  it("counts a collected listing once even when it also has a completed claim, and skips deleted ones", async () => {
    fallbackWith(
      [
        listing({ id: "L1", status: "collected", quantity: "5" }),
        listing({
          id: "L2",
          status: "collected",
          quantity: "99",
          deletedAt: "2025-06-16T00:00:00.000Z",
        }),
      ],
      [request({ listingId: "L1", status: "completed" })],
    );

    const metrics = await getRescuedMetrics("token-1");

    expect(metrics.collectedCount).toBe(1);
    expect(metrics.rescuedByUnit).toEqual([
      { unit: "kg", amount: 5, formatted: "5 kg" },
    ]);
  });

  it("fetches listings the search didn't return, tolerating ones it can't read", async () => {
    fallbackWith(
      [],
      [
        request({ listingId: "L9", status: "completed", collectedQuantity: "3" }),
        request({ listingId: "gone", status: "completed", collectedQuantity: "2" }),
      ],
    );
    apiMock.getListing.mockImplementation(async (id: string) => {
      if (id === "L9") return listing({ id: "L9", unit: "loaves" });
      throw new Error("forbidden");
    });

    const metrics = await getRescuedMetrics("token-1");

    expect(apiMock.getListing).toHaveBeenCalledWith("L9");
    expect(apiMock.getListing).toHaveBeenCalledWith("gone");
    expect(metrics.rescuedByUnit).toEqual([
      { unit: "loaves", amount: 3, formatted: "3 loaves" },
      // Unknown listing: the unit falls back to a generic one.
      { unit: "units", amount: 2, formatted: "2 units" },
    ]);
  });

  it("computes average and median time from publication to claim", async () => {
    const ids = ["A", "B", "C", "D", "E"];
    fallbackWith(
      ids.map((id) => listing({ id })),
      [
        request({ listingId: "A", requestedAt: minutesAfterT0(10) }),
        request({ listingId: "B", requestedAt: minutesAfterT0(30) }),
        request({ listingId: "C", requestedAt: minutesAfterT0(50) }),
        request({ listingId: "D", requestedAt: minutesAfterT0(120) }),
        // Claimed "before" publication (clock skew): excluded.
        request({ listingId: "E", requestedAt: minutesAfterT0(-5) }),
      ],
    );

    const metrics = await getRescuedMetrics("token-1");

    expect(metrics.timeToClaimCount).toBe(4);
    expect(metrics.avgTimeToClaimMs).toBe(52.5 * 60_000);
    // Even count: mean of the two middle values (30 and 50 minutes).
    expect(metrics.medianTimeToClaimMs).toBe(40 * 60_000);
    expect(metrics.formattedAvgTimeToClaim).toBe("52 mins");
    expect(metrics.formattedMedianTimeToClaim).toBe("40 mins");
  });

  it("pages through results until the total is reached", async () => {
    fallbackWith([], []);
    const full = Array.from({ length: 100 }, (_, i) => listing({ id: `L${i}` }));
    apiMock.listListings
      .mockResolvedValueOnce(page(full, 150))
      .mockResolvedValueOnce(page(full.slice(0, 50), 150));

    await getRescuedMetrics("token-1");

    expect(apiMock.listListings).toHaveBeenCalledTimes(2);
    expect(apiMock.listListings.mock.calls[1][0]).toMatchObject({
      offset: 100,
      limit: 100,
    });
  });

  it("stops paging at 500 items however many the service reports", async () => {
    fallbackWith([], []);
    const full = Array.from({ length: 100 }, (_, i) => listing({ id: `L${i}` }));
    apiMock.listListings.mockResolvedValue(page(full, 10_000));

    await getRescuedMetrics("token-1");

    expect(apiMock.listListings).toHaveBeenCalledTimes(5);
  });
});
