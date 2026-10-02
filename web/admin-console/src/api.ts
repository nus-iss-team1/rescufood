import { ListingsClient } from "@rescufood/listings-sdk";
import { ProfileClient } from "@rescufood/profile-sdk";

import { getToken, signOut } from "./auth";
import { config } from "./config";

function onUnauthorized() {
  signOut();
  window.dispatchEvent(new Event("admin:session-expired"));
}

export const client = new ProfileClient({
  baseUrl: config.apiBase,
  getToken,
  onUnauthorized,
});

// Separate service, separate base url - the audit log lives with listings.
export const listingsClient = new ListingsClient({
  baseUrl: config.listingsApiBase,
  getToken,
  onUnauthorized,
});

export { ApiError } from "@rescufood/profile-sdk";
export { ApiError as ListingsApiError } from "@rescufood/listings-sdk";
