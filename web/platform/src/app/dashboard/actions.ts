"use server";

import { auth } from "@/auth";
import { getOrgSummary, ListingsApiError, type OrgSummary } from "@/lib/listings";

export type OrgSummaryActionResult = {
  data?: OrgSummary;
  error?: string;
  denied?: boolean;
};

export async function getOrgSummaryAction(): Promise<OrgSummaryActionResult> {
  const session = await auth();
  const idToken = session?.idToken;
  if (!idToken) {
    return { error: "Session expired. Please sign in again.", denied: true };
  }

  try {
    const data = await getOrgSummary(idToken);
    return { data };
  } catch (err) {
    if (err instanceof ListingsApiError) {
      if (err.status === 401 || err.status === 403) {
        return {
          error: "You must belong to an approved organisation to view this summary.",
          denied: true,
        };
      }
      return { error: err.message };
    }
    return { error: "Could not reach the listings service. Please try again." };
  }
}
