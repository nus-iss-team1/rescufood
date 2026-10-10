// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createListingAction,
  deleteListingAction,
  updateListingAction,
} from "./actions";

const { authMock, listings, ListingsApiError, revalidatePathMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    listings: {
      createListing: vi.fn(),
      updateListing: vi.fn(),
      deleteListing: vi.fn(),
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

function form(fields: Record<string, string | File>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

/** A listing that passes every publish check, relative to the frozen clock. */
const publishable = {
  category: "produce",
  description: "Crate of apples",
  quantity: "12",
  unit: "kg",
  allergens: "none",
  pickupLocation: "Tampines Hub",
  pickupWindowStart: "2025-06-16T10:00:00.000Z",
  pickupWindowEnd: "2025-06-16T12:00:00.000Z",
  useBy: "2025-06-18T00:00:00.000Z",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2025-06-15T00:00:00.000Z"));
  authMock.mockResolvedValue({ idToken: "token-1" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createListingAction", () => {
  beforeEach(() => {
    listings.createListing.mockResolvedValue({ id: "L1", version: 1 });
    listings.updateListing.mockResolvedValue({});
  });

  it("keeps the form values when the session has expired", async () => {
    authMock.mockResolvedValue(null);

    const state = await createListingAction({}, form(publishable));

    expect(state.error).toMatch(/session has expired/);
    expect(state.values?.description).toBe("Crate of apples");
    expect(listings.createListing).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown category", { category: "rocks" }, "Please choose a category."],
    ["no description", { description: "" }, "Please describe what you are giving away."],
    ["a zero quantity", { quantity: "0" }, "Quantity must be a number greater than zero."],
    ["a non-numeric quantity", { quantity: "lots" }, "Quantity must be a number greater than zero."],
    ["no allergens", { allergens: " , " }, /enter "none"/],
    ["no use-by date", { useBy: "" }, "Please give a use-by date and time."],
    ["an incomplete pickup window", { pickupWindowEnd: "" }, "Please give both ends of the pickup window."],
    [
      "a window that ends before it starts",
      { pickupWindowEnd: "2025-06-16T09:00:00.000Z" },
      "Pickup end time must be after the start time.",
    ],
    [
      "a window that has already ended",
      {
        pickupWindowStart: "2025-06-14T10:00:00.000Z",
        pickupWindowEnd: "2025-06-14T12:00:00.000Z",
      },
      /already ended/,
    ],
    [
      "food that is used-by before pickup closes",
      { useBy: "2025-06-16T11:00:00.000Z" },
      "Use-by date cannot be earlier than the pickup window ends.",
    ],
  ])("refuses to publish with %s", async (_case, override, message) => {
    const state = await createListingAction(
      {},
      form({ ...publishable, ...override }),
    );

    expect(state.error).toEqual(
      typeof message === "string" ? message : expect.stringMatching(message),
    );
    expect(listings.createListing).not.toHaveBeenCalled();
  });

  it("creates then publishes a valid listing, normalising its fields", async () => {
    const state = await createListingAction(
      {},
      form({ ...publishable, allergens: "nuts, dairy ,, " }),
    );

    expect(state).toEqual({ publishedId: "L1", status: "available" });
    expect(listings.createListing).toHaveBeenCalledWith(
      "token-1",
      expect.objectContaining({ quantity: 12, allergens: ["nuts", "dairy"] }),
      [],
    );
    expect(listings.updateListing).toHaveBeenCalledWith("token-1", "L1", {
      version: 1,
      status: "available",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/listings");
  });

  it("attaches an uploaded photo but ignores an empty file input", async () => {
    const photo = new File(["jpeg-bytes"], "apples.jpg");

    await createListingAction({}, form({ ...publishable, image: photo }));
    await createListingAction(
      {},
      form({ ...publishable, image: new File([], "") }),
    );

    expect(listings.createListing.mock.calls[0][2]).toHaveLength(1);
    expect(listings.createListing.mock.calls[1][2]).toEqual([]);
  });

  it("saves a draft with only the fields filled in, skipping validation", async () => {
    const state = await createListingAction(
      {},
      form({ intent: "draft", description: "Bread, details TBC", quantity: "0" }),
    );

    expect(state).toEqual({ publishedId: "L1", status: "draft" });
    expect(listings.createListing.mock.calls[0][1]).toMatchObject({
      category: undefined,
      description: "Bread, details TBC",
      quantity: undefined,
      pickupWindowStart: undefined,
    });
    expect(listings.updateListing).not.toHaveBeenCalled();
  });

  it("tells the donor the draft survived when publishing fails", async () => {
    listings.updateListing.mockRejectedValue(new Error("down"));

    const state = await createListingAction({}, form(publishable));

    expect(state.error).toMatch(/saved as a draft, but publishing it failed/);
  });

  it("surfaces the service's error, or a generic one when it is unreachable", async () => {
    listings.createListing.mockRejectedValueOnce(
      new ListingsApiError(400, "pickupLocation too long"),
    );
    listings.createListing.mockRejectedValueOnce(new TypeError("fetch failed"));

    const apiState = await createListingAction({}, form(publishable));
    const downState = await createListingAction({}, form(publishable));

    expect(apiState.error).toBe("pickupLocation too long");
    expect(downState.error).toMatch(/Could not reach the listings service/);
  });
});

describe("updateListingAction", () => {
  const editing = {
    ...publishable,
    id: "L1",
    version: "3",
    currentStatus: "available",
  };

  beforeEach(() => {
    listings.updateListing.mockResolvedValue({});
  });

  it.each(["reserved", "collected", "expired", "cancelled"])(
    "refuses to edit a %s listing",
    async (currentStatus) => {
      const state = await updateListingAction(
        {},
        form({ ...editing, currentStatus }),
      );

      expect(state.error).toMatch(/locked and cannot be edited/);
      expect(listings.updateListing).not.toHaveBeenCalled();
    },
  );

  it.each(["", "0", "1.5", "abc"])(
    "rejects an invalid version %j",
    async (version) => {
      const state = await updateListingAction({}, form({ ...editing, version }));

      expect(state.error).toMatch(/version/);
      expect(listings.updateListing).not.toHaveBeenCalled();
    },
  );

  it("validates strictly when the listing is already live", async () => {
    const state = await updateListingAction(
      {},
      form({ ...editing, description: "" }),
    );

    expect(state.error).toBe("Please describe what you are giving away.");
  });

  it("lets a draft be saved incomplete", async () => {
    const state = await updateListingAction(
      {},
      form({ id: "L1", version: "3", currentStatus: "draft", description: "" }),
    );

    expect(state).toEqual({ updatedId: "L1" });
  });

  it.each([
    ["a JSON array", '["img-1","img-2"]'],
    ["a comma-separated list", "img-1, img-2"],
  ])("accepts image deletions as %s", async (_case, deleteImageIds) => {
    await updateListingAction({}, form({ ...editing, deleteImageIds }));

    expect(listings.updateListing.mock.calls[0][2]).toMatchObject({
      version: 3,
      deleteImageIds: ["img-1", "img-2"],
    });
  });

  it("only forwards a status the service recognises", async () => {
    await updateListingAction({}, form({ ...editing, status: "available" }));
    await updateListingAction({}, form({ ...editing, status: "bogus" }));

    expect(listings.updateListing.mock.calls[0][2].status).toBe("available");
    expect(listings.updateListing.mock.calls[1][2]).not.toHaveProperty("status");
  });

  it("forwards the donor's reason when cancelling", async () => {
    await updateListingAction(
      {},
      form({ ...editing, status: "cancelled", cancelledReason: " Fridge failed " }),
    );

    expect(listings.updateListing.mock.calls[0][2]).toMatchObject({
      status: "cancelled",
      cancelledReason: "Fridge failed",
    });
  });

  it.each([
    ["missing", {}],
    ["blank", { cancelledReason: "   " }],
  ])("rejects a cancellation whose reason is %s", async (_label, extra) => {
    const state = await updateListingAction(
      {},
      form({ ...editing, status: "cancelled", ...extra }),
    );

    expect(state.error).toBe("Please give a reason for cancelling this listing.");
    expect(listings.updateListing).not.toHaveBeenCalled();
  });

  it("sends no reason when not cancelling", async () => {
    await updateListingAction({}, form({ ...editing, status: "available" }));

    expect(listings.updateListing.mock.calls[0][2]).not.toHaveProperty(
      "cancelledReason",
    );
  });

  it("explains a version conflict from a concurrent edit", async () => {
    listings.updateListing.mockRejectedValue(new ListingsApiError(409, "stale"));

    const state = await updateListingAction({}, form(editing));

    expect(state.error).toMatch(/updated elsewhere/);
  });
});

describe("deleteListingAction", () => {
  it("refreshes every page that showed the listing", async () => {
    listings.deleteListing.mockResolvedValue(undefined);

    const state = await deleteListingAction({}, form({ listingId: "L1" }));

    expect(state).toEqual({ deletedId: "L1" });
    for (const path of ["/listings", "/listings/L1", "/browse", "/browse/L1", "/dashboard"]) {
      expect(revalidatePathMock).toHaveBeenCalledWith(path);
    }
  });

  it("explains that a claimed listing can't be deleted", async () => {
    listings.deleteListing.mockRejectedValue(new ListingsApiError(409, "conflict"));

    const state = await deleteListingAction({}, form({ listingId: "L1" }));

    expect(state.error).toBe(
      "This listing has associated requests and cannot be deleted.",
    );
  });
});
