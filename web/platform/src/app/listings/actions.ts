"use server";

import { revalidatePath } from "next/cache";
import {
  listingCategories,
  listingStatuses,
  type ListingStatus,
} from "@rescufood/listings-sdk";

import { auth } from "@/auth";
import {
  createListing,
  updateListing,
  ListingsApiError,
  type ListingUpdate,
  type NewListing,
} from "@/lib/listings";

export type ListingFormValues = {
  category?: string;
  remainingQuantity?: string;
  unit?: string;
  description?: string;
  allergens?: string;
  useBy?: string;
  handlingInstructions?: string;
  pickupLocation?: string;
  pickupWindowStart?: string;
  pickupWindowEnd?: string;
  status?: string;
};

export type ListingFormState = {
  error?: string;
  /** Set once the listing is live. */
  publishedId?: string;
  /** Set once the listing has been updated. */
  updatedId?: string;
  values?: ListingFormValues;
};

const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();

/** datetime-local values carry no zone; the browser's is the right one. */
function isoOrNull(value: string): string | null {
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

function extractValues(form: FormData): ListingFormValues {
  return {
    category: text(form, "category"),
    remainingQuantity: text(form, "remainingQuantity"),
    unit: text(form, "unit"),
    description: text(form, "description"),
    allergens: text(form, "allergens"),
    useBy: text(form, "useBy"),
    handlingInstructions: text(form, "handlingInstructions"),
    pickupLocation: text(form, "pickupLocation"),
    pickupWindowStart: text(form, "pickupWindowStart"),
    pickupWindowEnd: text(form, "pickupWindowEnd"),
    status: text(form, "status") || undefined,
  };
}

function readListing(
  form: FormData,
  isAvailableTarget: boolean = true
): NewListing | string {
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

  if (isAvailableTarget) {
    if (new Date(useBy) < new Date(start)) {
      return "Use-by date cannot be earlier than the pickup window start.";
    }
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
  const values = extractValues(formData);

  const session = await auth();
  const idToken = session?.idToken;
  if (!idToken) {
    return { error: "Your session has expired. Please sign in again.", values };
  }

  const listing = readListing(formData, true);
  if (typeof listing === "string") return { error: listing, values };

  const imageEntry = formData.get("image");
  const images: Blob[] = [];
  if (imageEntry instanceof File && imageEntry.size > 0) {
    images.push(imageEntry);
  }

  let created;
  try {
    created = await createListing(idToken, listing, images);
  } catch (err) {
    if (err instanceof ListingsApiError) {
      return { error: err.message, values };
    }
    return {
      error: "Could not reach the listings service. Please try again.",
      values,
    };
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
      values,
    };
  }

  revalidatePath("/listings");
  return { publishedId: created.id };
}

const LOCKED_STATUSES = new Set(["reserved", "collected", "expired", "cancelled"]);

/**
 * Updates an existing listing via PATCH /listings/:id.
 * Enforces dual validation modes (strict when published/available, looser for draft)
 * and guards against modifying locked terminal states.
 */
export async function updateListingAction(
  _prev: ListingFormState,
  formData: FormData
): Promise<ListingFormState> {
  const values = extractValues(formData);

  const session = await auth();
  const idToken = session?.idToken;
  if (!idToken) {
    return { error: "Your session has expired. Please sign in again.", values };
  }

  const id = text(formData, "id");
  const versionStr = text(formData, "version");
  const currentStatus = text(formData, "currentStatus");
  const targetStatus = text(formData, "status");

  if (!id || !versionStr) {
    return { error: "Missing listing identifier or version.", values };
  }

  const version = Number(versionStr);
  if (!Number.isInteger(version) || version < 1) {
    return { error: "Invalid listing version.", values };
  }

  // State Machine Lock Guard
  if (LOCKED_STATUSES.has(currentStatus)) {
    return {
      error: `Listings in "${currentStatus}" status are locked and cannot be edited.`,
      values,
    };
  }

  const isPublishingOrAvailable =
    targetStatus === "available" ||
    (!targetStatus && currentStatus === "available");

  const listingData = readListing(formData, isPublishingOrAvailable);
  if (typeof listingData === "string") {
    return { error: listingData, values };
  }

  // Parse any deleteImageIds passed as JSON array or comma separated
  const deleteImageIdsRaw = text(formData, "deleteImageIds");
  let deleteImageIds: string[] = [];
  if (deleteImageIdsRaw) {
    try {
      const parsed = JSON.parse(deleteImageIdsRaw);
      if (Array.isArray(parsed)) {
        deleteImageIds = parsed.filter((x) => typeof x === "string");
      }
    } catch {
      deleteImageIds = deleteImageIdsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const imageEntry = formData.get("image");
  const images: Blob[] = [];
  if (imageEntry instanceof File && imageEntry.size > 0) {
    images.push(imageEntry);
  }

  const updatePayload: ListingUpdate = {
    version,
    category: listingData.category,
    description: listingData.description,
    remainingQuantity: listingData.remainingQuantity,
    unit: listingData.unit,
    allergens: listingData.allergens,
    handlingInstructions: listingData.handlingInstructions,
    useBy: listingData.useBy,
    pickupLocation: listingData.pickupLocation,
    pickupWindowStart: listingData.pickupWindowStart,
    pickupWindowEnd: listingData.pickupWindowEnd,
    ...(targetStatus &&
    listingStatuses.includes(targetStatus as ListingStatus)
      ? { status: targetStatus as ListingStatus }
      : {}),
    ...(deleteImageIds.length > 0 ? { deleteImageIds } : {}),
  };

  try {
    await updateListing(idToken, id, updatePayload, images);
    revalidatePath("/listings");
    revalidatePath(`/listings/${id}`);
    return { updatedId: id };
  } catch (err) {
    if (err instanceof ListingsApiError) {
      if (err.status === 409) {
        return {
          error:
            "This listing was updated elsewhere. Please refresh the page and try again.",
          values,
        };
      }
      return { error: err.message, values };
    }
    return {
      error: "Could not reach the listings service. Please try again.",
      values,
    };
  }
}

