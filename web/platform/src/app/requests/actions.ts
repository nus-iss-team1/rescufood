"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  createRequest,
  decideRequest,
  generatePickupCode,
  lookupPickupCode,
  verifyPickupCode,
  ListingsApiError,
  type PickupCode,
  type PickupCodeMatch,
  type RelistBlockedReason,
} from "@/lib/listings";

export type RequestFormState = {
  error?: string;
  /** Set once the claim is filed or cancelled. */
  requestedId?: string;
  listingRelisted?: boolean;
  relistBlockedReason?: RelistBlockedReason | null;
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

export async function cancelRequestAction(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const token = await idToken();
  if (!token) return { error: expired };

  const id = String(formData.get("requestId") ?? "").trim();
  if (!id) return { error: "Missing request ID." };

  const cancellationReason = String(formData.get("reason") ?? "").trim();
  if (!cancellationReason) {
    return { error: "A cancellation reason is required." };
  }

  let updated;
  try {
    updated = await decideRequest(token, id, {
      status: "cancelled",
      cancellationReason,
    });
    if (updated.listingId) {
      revalidatePath(`/browse/${updated.listingId}`);
    }
  } catch (err) {
    if (err instanceof ListingsApiError) return { error: err.message };
    return { error: unreachable };
  }
  revalidatePath("/requests");
  revalidatePath(`/requests/${id}`);
  revalidatePath("/browse");
  revalidatePath("/listings");
  revalidatePath("/dashboard");
  return {
    requestedId: id,
    listingRelisted: updated.listingRelisted,
    relistBlockedReason: updated.relistBlockedReason ?? null,
  };
}

export async function reportNoShowAction(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const token = await idToken();
  if (!token) return { error: expired };

  const id = String(formData.get("requestId") ?? "").trim();
  if (!id) return { error: "Missing request ID." };

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    return { error: "A reason is required to report a no-show." };
  }

  let updated;
  try {
    updated = await decideRequest(token, id, {
      status: "no_show",
      noShowReason: reason,
    });
    if (updated.listingId) {
      revalidatePath(`/browse/${updated.listingId}`);
    }
  } catch (err) {
    if (err instanceof ListingsApiError) return { error: err.message };
    return { error: unreachable };
  }
  revalidatePath("/requests");
  revalidatePath(`/requests/${id}`);
  revalidatePath("/browse");
  revalidatePath("/listings");
  revalidatePath("/dashboard");
  return {
    requestedId: id,
    listingRelisted: updated.listingRelisted,
    relistBlockedReason: updated.relistBlockedReason ?? null,
  };
}

export async function recordFailedCollectionAction(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const token = await idToken();
  if (!token) return { error: expired };

  const id = String(formData.get("requestId") ?? "").trim();
  if (!id) return { error: "Missing request ID." };

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    return { error: "A reason is required to record a failed collection." };
  }

  let updated;
  try {
    updated = await decideRequest(token, id, {
      status: "cancelled",
      cancellationReason: reason,
    });
    if (updated.listingId) {
      revalidatePath(`/browse/${updated.listingId}`);
    }
  } catch (err) {
    if (err instanceof ListingsApiError) return { error: err.message };
    return { error: unreachable };
  }
  revalidatePath("/requests");
  revalidatePath(`/requests/${id}`);
  revalidatePath("/browse");
  revalidatePath("/listings");
  revalidatePath("/dashboard");
  return {
    requestedId: id,
    listingRelisted: updated.listingRelisted,
    relistBlockedReason: updated.relistBlockedReason ?? null,
  };
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
    revalidatePath(`/requests/${requestId}`);
    return { data };
  } catch (err) {
    if (err instanceof ListingsApiError) return { error: err.message };
    return { error: unreachable };
  }
}

export async function lookupPickupCodeAction(
  code: string,
): Promise<{ data?: PickupCodeMatch; error?: string }> {
  const token = await idToken();
  if (!token) return { error: expired };

  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code." };

  try {
    const data = await lookupPickupCode(token, code);
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

  const rawQuantity = formData.get("collectedQuantity") ?? formData.get("actualQuantity");
  let collectedQuantity: number | undefined;

  if (rawQuantity !== null && rawQuantity !== undefined && String(rawQuantity).trim() !== "") {
    const parsed = Number(rawQuantity);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { error: "Collected quantity must be greater than zero." };
    }
    collectedQuantity = parsed;
  }

  try {
    const updated = await verifyPickupCode(token, id, {
      code,
      collectedQuantity,
    });
    
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

export const completePickupAction = verifyPickupCodeAction;
