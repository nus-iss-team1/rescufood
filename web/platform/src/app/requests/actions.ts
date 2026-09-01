"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  createRequest,
  decideRequest,
  generatePickupCode,
  verifyPickupCode,
  ListingsApiError,
  type PickupCode,
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

/** Claims the whole listing, first-come-first-served. Idempotent on the key the form mints. */
export async function createRequestAction(
  _prev: RequestFormState,
  formData: FormData
): Promise<RequestFormState> {
  const token = await idToken();
  if (!token) return { error: expired };

  const listingId = String(formData.get("listingId") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");

  if (!listingId || !idempotencyKey) {
    return { error: "Something went wrong. Please reload and try again." };
  }

  try {
    const created = await createRequest(token, { listingId, idempotencyKey });
    revalidatePath(`/browse/${listingId}`);
    revalidatePath("/browse");
    revalidatePath("/requests");
    return { requestedId: created.id };
  } catch (err) {
    if (err instanceof ListingsApiError) {
      if (err.status === 409) {
        return {
          error: "Another partner has already claimed this listing.",
        };
      }
      return { error: err.message };
    }
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
  revalidatePath(`/requests/${id}`);
  revalidatePath("/browse");
  revalidatePath("/listings");
  revalidatePath("/dashboard");
}

export async function getPickupCredentialAction(
  requestId: string,
  regenerate = false
): Promise<{ data?: PickupCode; error?: string }> {
  const token = await idToken();
  if (!token) return { error: expired };

  if (!requestId) return { error: "Missing request ID." };

  try {
    const data = await generatePickupCode(token, requestId, regenerate);
    return { data };
  } catch (err) {
    if (err instanceof ListingsApiError) return { error: err.message };
    return { error: unreachable };
  }
}

export async function verifyPickupCodeAction(
  prevState: { success?: boolean; error?: string },
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const token = await idToken();
  if (!token) return { error: expired };

  const id = String(formData.get("requestId") ?? "");
  if (!id) return { error: "Missing request ID." };

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Verification code is required." };

  try {
    const updated = await verifyPickupCode(token, id, { code });
    
    revalidatePath("/requests");
    revalidatePath(`/requests/${id}`);
    revalidatePath("/browse");
    revalidatePath("/listings");
    revalidatePath("/dashboard");
    if (updated.listingId) {
      revalidatePath(`/browse/${updated.listingId}`);
      revalidatePath(`/listings/${updated.listingId}`);
    }
    
    return { success: true };
  } catch (err) {
    if (err instanceof ListingsApiError) return { error: err.message };
    return { error: unreachable };
  }
}
