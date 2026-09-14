import { ProfileClient } from "@rescufood/profile-sdk";

import { getToken, signOut } from "./auth";
import { config } from "./config";

export const client = new ProfileClient({
  baseUrl: config.apiBase,
  getToken,
  onUnauthorized: () => {
    signOut();
    window.dispatchEvent(new Event("admin:session-expired"));
  },
});

export { ApiError } from "@rescufood/profile-sdk";
