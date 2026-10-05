// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListingsClientOptions } from "@rescufood/listings-sdk";
import { getRescuedMetrics, listListings, ListingsApiError } from "./listings";

const { apiMock, createListingsClientMock } = vi.hoisted(() => {
  const apiMock = {
    listListings: vi.fn(),
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
  it("returns the service's metrics", async () => {
    const metrics = { lotsCollected: 9, claimsCompleted: 11 };
    apiMock.getRescuedMetrics.mockResolvedValue(metrics);

    await expect(getRescuedMetrics("token-1")).resolves.toBe(metrics);
  });

  it.each([404, 500])(
    "rethrows a %i without computing metrics itself",
    async (status) => {
      const err = new ListingsApiError(status, "failed");
      apiMock.getRescuedMetrics.mockRejectedValue(err);

      await expect(getRescuedMetrics("token-1")).rejects.toBe(err);
      expect(apiMock.listListings).not.toHaveBeenCalled();
    },
  );
});
