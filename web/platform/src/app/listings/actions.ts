"use server";

import { listingCategories } from "@rescufood/listings-sdk";

import { auth } from "@/auth";
import {
  createListing,
  updateListing,
  ListingsApiError,
  type NewListing,
} from "@/lib/listings";

export type ListingFormState = {
  error?: string;
  /** Set once the listing is live. */
  publishedId?: string;
};

const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();

/** datetime-local values carry no zone; the browser's is the right one. */
function isoOrNull(value: string): string | null {
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

function readListing(form: FormData): NewListing | string {
  const category = text(form, "category");
  if (!listingCategories.includes(category as NewListing["category"])) {
    return "Please choose a category.";
  }

  const description = text(form, "description");
  if (!description) return "Please describe what you are giving away.";

  const quantity = Number(text(form, "remainingQuantity"));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "Quantity must be a number greater than zero.";
  }

  const unit = text(form, "unit");
  if (!unit) return "Please give the unit, for example kg or meals.";

  const pickupLocation = text(form, "pickupLocation");
  if (!pickupLocation) return "Please give a pickup address.";

  const useBy = isoOrNull(text(form, "useBy"));
  if (!useBy) return "Please give a use-by date and time.";

  const start = isoOrNull(text(form, "pickupWindowStart"));
  const end = isoOrNull(text(form, "pickupWindowEnd"));
  if (!start || !end) return "Please give both ends of the pickup window.";
  if (new Date(end) <= new Date(start)) {
    return "The pickup window must end after it starts.";
  }

  return {
    category: category as NewListing["category"],
    description,
    remainingQuantity: quantity,
    unit,
    allergens: text(form, "allergens")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean),
    handlingInstructions: text(form, "handlingInstructions"),
    useBy,
    pickupLocation,
    pickupWindowStart: start,
    pickupWindowEnd: end,
  };
}

/**
 * Creates the listing and moves it out of draft. The service defaults new
 * listings to draft, so publishing is the create followed by a status
 * change to available.
 */
export async function createListingAction(
  _prev: ListingFormState,
  formData: FormData
): Promise<ListingFormState> {
  const session = await auth();
  const idToken = session?.idToken;
  if (!idToken) {
    return { error: "Your session has expired. Please sign in again." };
  }

  const listing = readListing(formData);
  if (typeof listing === "string") return { error: listing };

  let created;
  try {
    created = await createListing(idToken, listing);
  } catch (err) {
    if (err instanceof ListingsApiError) {
      return { error: err.message };
    }
    return { error: "Could not reach the listings service. Please try again." };
  }

  try {
    await updateListing(idToken, created.id, {
      version: created.version,
      status: "available",
    });
  } catch {
    return {
      error:
        "Your listing was saved as a draft, but publishing it failed. Open it from your listings to publish.",
    };
  }

  return { publishedId: created.id };
}
