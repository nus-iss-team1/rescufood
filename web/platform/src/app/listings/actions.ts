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
  /** Set once the listing is live or saved as draft. */
  publishedId?: string;
  /** Status of the created listing: 'draft' | 'available' */
  status?: string;
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
  const categoryRaw = text(form, "category");
  const descriptionRaw = text(form, "description");
  const quantityRaw = Number(text(form, "remainingQuantity"));
  const unitRaw = text(form, "unit");
  const pickupLocationRaw = text(form, "pickupLocation");
  const useByRaw = isoOrNull(text(form, "useBy"));
  const startRaw = isoOrNull(text(form, "pickupWindowStart"));
  const endRaw = isoOrNull(text(form, "pickupWindowEnd"));
  const allergens = text(form, "allergens")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  const handlingInstructions = text(form, "handlingInstructions");

  if (isAvailableTarget) {
    if (!listingCategories.includes(categoryRaw as NewListing["category"])) {
      return "Please choose a category.";
    }
    if (!descriptionRaw) return "Please describe what you are giving away.";
    if (!Number.isFinite(quantityRaw) || quantityRaw <= 0) {
      return "Quantity must be a number greater than zero.";
    }
    if (!unitRaw) return "Please give the unit, for example kg or meals.";
    if (!pickupLocationRaw) return "Please give a pickup address.";
    if (!useByRaw) return "Please give a use-by date and time.";
    if (!startRaw || !endRaw) return "Please give both ends of the pickup window.";
    if (new Date(endRaw) <= new Date(startRaw)) {
      return "The pickup window must end after it starts.";
    }

    const now = new Date();
    if (new Date(endRaw) <= now) {
      return "The pickup window has already ended. Please set a future collection time.";
    }
    if (new Date(useByRaw) <= now) {
      return "The use-by date must be in the future.";
    }
    if (new Date(useByRaw) < new Date(startRaw)) {
      return "Use-by date cannot be earlier than the pickup window start.";
    }

    return {
      category: categoryRaw as NewListing["category"],
      description: descriptionRaw,
      remainingQuantity: quantityRaw,
      unit: unitRaw,
      allergens,
      handlingInstructions,
      useBy: useByRaw,
      pickupLocation: pickupLocationRaw,
      pickupWindowStart: startRaw,
      pickupWindowEnd: endRaw,
    };
  }

  // Draft mode: allow saving even with partial/empty fields by using valid type fallbacks
  const now = new Date();
  const defaultStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
  defaultStart.setHours(9, 0, 0, 0);
  const defaultEnd = new Date(defaultStart.getTime() + 8 * 60 * 60 * 1000); // tomorrow 17:00
  const defaultUseBy = new Date(defaultStart.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later

  const category = listingCategories.includes(categoryRaw as NewListing["category"])
    ? (categoryRaw as NewListing["category"])
    : "produce";
  const description = descriptionRaw || "Untitled draft";
  const remainingQuantity =
    Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;
  const unit = unitRaw || "items";
  const pickupLocation = pickupLocationRaw || "To be determined";
  const start = startRaw || defaultStart.toISOString();
  let end = endRaw || defaultEnd.toISOString();
  if (new Date(end) <= new Date(start)) {
    end = new Date(new Date(start).getTime() + 8 * 60 * 60 * 1000).toISOString();
  }
  const useBy = useByRaw || defaultUseBy.toISOString();

  return {
    category,
    description,
    remainingQuantity,
    unit,
    allergens,
    handlingInstructions,
    useBy,
    pickupLocation,
    pickupWindowStart: start,
    pickupWindowEnd: end,
  };
}

/**
 * Creates the listing. Defaults new listings to draft in the service.
 * If intent is 'available', immediately transitions it to available.
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

  const intent = text(formData, "intent") || text(formData, "status") || "available";
  const isPublishing = intent === "available";

  const listing = readListing(formData, isPublishing);
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

  if (isPublishing) {
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
  }

  revalidatePath("/listings");
  return {
    publishedId: created.id,
    status: isPublishing ? "available" : "draft",
  };
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

