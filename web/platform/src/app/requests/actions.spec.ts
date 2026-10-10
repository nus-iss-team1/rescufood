// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelRequestAction,
  createRequestAction,
  lookupPickupCodeAction,
  verifyPickupCodeAction,
} from "./actions";

const { authMock, listings, ListingsApiError, revalidatePathMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    listings: {
      createRequest: vi.fn(),
      decideRequest: vi.fn(),
      generatePickupCode: vi.fn(),
      lookupPickupCode: vi.fn(),
      verifyPickupCode: vi.fn(),
    },
    ListingsApiError: class ListingsApiError extends Error {
      constructor(
        readonly status: number,
        detail: string,
      ) {
        super(detail);
      }
    },
    revalidatePathMock: vi.fn(),
  }));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/listings", () => ({ ...listings, ListingsApiError }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  authMock.mockResolvedValue({ idToken: "token-1" });
});

describe("createRequestAction", () => {
  const claim = { listingId: "L1", idempotencyKey: "key-1" };

  it("requires a session", async () => {
    authMock.mockResolvedValue(null);

    const state = await createRequestAction({}, form(claim));

    expect(state.error).toMatch(/session has expired/);
    expect(listings.createRequest).not.toHaveBeenCalled();
  });

  it("requires the idempotency key the form mints", async () => {
    const state = await createRequestAction({}, form({ listingId: "L1" }));

    expect(state.error).toMatch(/reload and try again/);
    expect(listings.createRequest).not.toHaveBeenCalled();
  });

  it("files the claim and refreshes the listing and requests pages", async () => {
    listings.createRequest.mockResolvedValue({ id: "R1" });

    const state = await createRequestAction({}, form(claim));

    expect(state).toEqual({ requestedId: "R1" });
    expect(listings.createRequest).toHaveBeenCalledWith("token-1", claim);
    expect(revalidatePathMock).toHaveBeenCalledWith("/browse/L1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/requests");
  });

  it("tells the partner when someone else claimed the listing first", async () => {
    listings.createRequest.mockRejectedValue(new ListingsApiError(409, "taken"));

    const state = await createRequestAction({}, form(claim));

    expect(state.error).toBe("Another partner has already claimed this listing.");
  });
});

describe("cancelRequestAction", () => {
  it("cancels with the trimmed reason and refreshes the freed listing", async () => {
    listings.decideRequest.mockResolvedValue({ listingId: "L1" });

    const state = await cancelRequestAction(
      {},
      form({ requestId: "R1", reason: "  van broke down  " }),
    );

    expect(state).toEqual({ requestedId: "R1" });
    expect(listings.decideRequest).toHaveBeenCalledWith("token-1", "R1", {
      status: "cancelled",
      cancellationReason: "van broke down",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/browse/L1");
  });

  it.each([
    ["missing", {}],
    ["blank", { reason: "   " }],
  ])("sends a fallback reason when it is %s", async (_label, extra) => {
    listings.decideRequest.mockResolvedValue({ listingId: "L1" });

    await cancelRequestAction({}, form({ requestId: "R1", ...extra }));

    expect(listings.decideRequest).toHaveBeenCalledWith("token-1", "R1", {
      status: "cancelled",
      cancellationReason: "No reason given",
    });
  });

  it("surfaces the service's error and skips revalidation", async () => {
    listings.decideRequest.mockRejectedValue(
      new ListingsApiError(422, "Request is already completed"),
    );

    const state = await cancelRequestAction({}, form({ requestId: "R1" }));

    expect(state.error).toBe("Request is already completed");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("lookupPickupCodeAction", () => {
  it.each(["12345", "1234567", "12a456", ""])(
    "rejects %j without calling the service",
    async (code) => {
      const state = await lookupPickupCodeAction(code);

      expect(state.error).toBe("Enter the 6-digit code.");
      expect(listings.lookupPickupCode).not.toHaveBeenCalled();
    },
  );

  it("looks up a 6-digit code", async () => {
    const match = { requestId: "R1" };
    listings.lookupPickupCode.mockResolvedValue(match);

    await expect(lookupPickupCodeAction("123456")).resolves.toEqual({
      data: match,
    });
  });
});

describe("verifyPickupCodeAction", () => {
  beforeEach(() => {
    listings.verifyPickupCode.mockResolvedValue({ listingId: "L1" });
  });

  it("requires a code", async () => {
    const state = await verifyPickupCodeAction({}, form({ requestId: "R1" }));

    expect(state.error).toBe("Verification code is required.");
  });

  it.each(["0", "-2", "abc"])(
    "rejects a collected quantity of %j",
    async (collectedQuantity) => {
      const state = await verifyPickupCodeAction(
        {},
        form({ requestId: "R1", code: "123456", collectedQuantity }),
      );

      expect(state.error).toBe("Collected quantity must be greater than zero.");
      expect(listings.verifyPickupCode).not.toHaveBeenCalled();
    },
  );

  it("treats a blank quantity as the full lot", async () => {
    await verifyPickupCodeAction(
      {},
      form({ requestId: "R1", code: "123456", collectedQuantity: " " }),
    );

    expect(listings.verifyPickupCode).toHaveBeenCalledWith("token-1", "R1", {
      code: "123456",
      collectedQuantity: undefined,
    });
  });

  it("accepts the legacy actualQuantity field", async () => {
    await verifyPickupCodeAction(
      {},
      form({ requestId: "R1", code: "123456", actualQuantity: "4.5" }),
    );

    expect(listings.verifyPickupCode.mock.calls[0][2]).toEqual({
      code: "123456",
      collectedQuantity: 4.5,
    });
  });

  it("completes the pickup and refreshes the listing's pages", async () => {
    const state = await verifyPickupCodeAction(
      {},
      form({ requestId: "R1", code: " 123456 " }),
    );

    expect(state).toEqual({ success: true });
    expect(listings.verifyPickupCode.mock.calls[0][2].code).toBe("123456");
    expect(revalidatePathMock).toHaveBeenCalledWith("/browse/L1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/listings/L1");
  });

  it("surfaces a wrong-code error from the service", async () => {
    listings.verifyPickupCode.mockRejectedValue(
      new ListingsApiError(400, "Invalid pickup code"),
    );

    const state = await verifyPickupCodeAction(
      {},
      form({ requestId: "R1", code: "000000" }),
    );

    expect(state.error).toBe("Invalid pickup code");
  });
});
