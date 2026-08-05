import "server-only";

import {
  ApiError,
  ProfileClient,
  type DomainLookup,
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
