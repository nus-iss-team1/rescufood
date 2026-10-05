// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOrgSummaryAction, getRescuedMetricsAction } from "./actions";

const { authMock, listings, ListingsApiError } = vi.hoisted(() => ({
  authMock: vi.fn(),
  listings: {
    getOrgSummary: vi.fn(),
    getRescuedMetrics: vi.fn(),
  },
  ListingsApiError: class ListingsApiError extends Error {
    constructor(
      readonly status: number,
      detail: string,
    ) {
      super(detail);
    }
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/listings", () => ({ ...listings, ListingsApiError }));

beforeEach(() => {
  vi.resetAllMocks();
  authMock.mockResolvedValue({ idToken: "token-1" });
});

const actions = [
  ["getOrgSummaryAction", getOrgSummaryAction, listings.getOrgSummary],
  ["getRescuedMetricsAction", getRescuedMetricsAction, listings.getRescuedMetrics],
] as const;

describe.each(actions)("%s", (_name, action, service) => {
  it("denies access without a session and skips the service", async () => {
    authMock.mockResolvedValue(null);

    await expect(action()).resolves.toMatchObject({
      denied: true,
      error: expect.stringMatching(/Session expired/),
    });
    expect(service).not.toHaveBeenCalled();
  });

  it("returns the service's data for the session's token", async () => {
    const data = { collectedCount: 3 };
    service.mockResolvedValue(data);

    await expect(action()).resolves.toEqual({ data });
    expect(service).toHaveBeenCalledWith("token-1");
  });

  it.each([401, 403])(
    "denies a user outside an approved organisation (%i)",
    async (status) => {
      service.mockRejectedValue(new ListingsApiError(status, "forbidden"));

      await expect(action()).resolves.toMatchObject({
        denied: true,
        error: expect.stringMatching(/approved organisation/),
      });
    },
  );

  it("surfaces other service errors without denying access", async () => {
    service.mockRejectedValue(new ListingsApiError(500, "Database timeout"));

    await expect(action()).resolves.toEqual({ error: "Database timeout" });
  });
});

it.each([
  [getOrgSummaryAction, listings.getOrgSummary, /Could not reach the listings service/],
  [getRescuedMetricsAction, listings.getRescuedMetrics, /Could not retrieve metrics/],
])("gives a generic error when the service is unreachable", async (action, service, message) => {
  service.mockRejectedValue(new TypeError("fetch failed"));

  const result = await action();

  expect(result.error).toMatch(message);
  expect(result.denied).toBeUndefined();
});
