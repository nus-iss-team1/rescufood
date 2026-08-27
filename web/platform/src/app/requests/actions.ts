"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  createRequest,
  decideRequest,
  ListingsApiError,
} from "@/lib/listings";

export type RequestFormState = {
  error?: string;
  /** Set once the claim is filed. */
  requestedId?: string;
};

async function idToken() {
  const session = await auth();
  return session?.idToken ?? null;
}

const expired = "Your session has expired. Please sign in again.";
const unreachable = "Could not reach the listings service. Please try again.";

/** Claims part or all of a listing. Idempotent on the key the form mints. */
export async function createRequestAction(
  _prev: RequestFormState,
  formData: FormData
): Promise<RequestFormState> {
  const token = await idToken();
  if (!token) return { error: expired };

  const listingId = String(formData.get("listingId") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const requestedQuantity = Number(formData.get("requestedQuantity") ?? "");

  if (!listingId || !idempotencyKey) {
    return { error: "Something went wrong. Please reload and try again." };
  }
  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
    return { error: "Enter how much you can collect." };
  }

  try {
    const created = await createRequest(token, {
      listingId,
      requestedQuantity,
      idempotencyKey,
    });
    revalidatePath(`/browse/${listingId}`);
    revalidatePath("/browse");
    revalidatePath("/requests");
    return { requestedId: created.id };
  } catch (err) {
    if (err instanceof ListingsApiError) return { error: err.message };
    return { error: unreachable };
  }
}

export async function cancelRequestAction(formData: FormData): Promise<void> {
  const token = await idToken();
  if (!token) return;

  const id = String(formData.get("requestId") ?? "");
  if (!id) return;

  try {
    const updated = await decideRequest(token, id, {
      status: "cancelled",
      cancellationReason: String(formData.get("reason") ?? "").trim(),
    });
    if (updated.listingId) {
      revalidatePath(`/browse/${updated.listingId}`);
    }
  } catch {
    // The list re-renders with whatever the service still reports.
  }
  revalidatePath("/requests");
  revalidatePath("/browse");
}
