import type { AuditEvent } from "@rescufood/listings-sdk";

import { client } from "../api";

// The audit api returns actor ids, not names - it deliberately joins nothing.
// Names come from the profile service instead, one call per organisation the
// loaded events mention (usually one or two). Results are cached for the life
// of the page, and a failed lookup is not fatal: the caller falls back to the
// short id.
const byOrg = new Map<string, Promise<Map<string, string>>>();

function membersOf(orgId: string): Promise<Map<string, string>> {
  const cached = byOrg.get(orgId);
  if (cached) return cached;

  const pending = client
    .listOrgMembers(orgId)
    .then((members) => new Map(members.map((m) => [m.id, m.name || m.email])))
    .catch(() => new Map<string, string>());

  byOrg.set(orgId, pending);
  return pending;
}

/** actor id -> display name, for every org the given events mention. */
export async function resolveActorNames(
  events: AuditEvent[],
): Promise<Map<string, string>> {
  const orgIds = [
    ...new Set(events.map((e) => e.orgId).filter((id): id is string => !!id)),
  ];
  const maps = await Promise.all(orgIds.map(membersOf));
  return new Map(maps.flatMap((m) => [...m]));
}
