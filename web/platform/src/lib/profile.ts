import "server-only";

import {
  ApiError,
  ProfileClient,
  type DomainLookup,
  type LoginStatus,
  type Me,
  type NewOrganisation,
  type Org,
  type User,
} from "@rescufood/profile-sdk";

const base = process.env.PROFILE_API_URL ?? "http://localhost:3001";

function client(idToken?: string) {
  return new ProfileClient({ baseUrl: base, getToken: () => idToken ?? null });
}

export { ApiError as ProfileApiError };
export type { Me, NewOrganisation, Org, User };

export function getMe(idToken: string): Promise<Me> {
  return client(idToken).getMe();
}

export function getMyOrgMembers(idToken: string): Promise<User[]> {
  return client(idToken).listMyOrgMembers();
}

export function registerOrganisation(org: NewOrganisation): Promise<Org> {
  return client().registerOrganisation(org);
}

export function lookupOrganisation(domain: string): Promise<DomainLookup> {
  return client().lookupOrganisation(domain);
}

export function loginStatus(username: string): Promise<LoginStatus> {
  return client().loginStatus(username);
}

export function recordLoginOutcome(username: string, success: boolean): Promise<void> {
  return client().recordLoginOutcome(username, success);
}

export function recordPasswordResetCompleted(username: string): Promise<void> {
  return client().recordPasswordResetCompleted(username);
}

/**
 * Whether identifier may reset its password. Fails open (treats a
 * profile-service hiccup as eligible) so an outage never blocks a
 * legitimate reset.
 */
export function resetEligibility(identifier: string): Promise<boolean> {
  return client()
    .resetEligibility(identifier)
    .then((r) => r.eligible)
    .catch(() => true);
}
