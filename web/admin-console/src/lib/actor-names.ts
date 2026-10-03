import type { AuditEvent } from "@rescufood/listings-sdk";

import { client } from "../api";

// The audit api returns actor ids, not names - it deliberately joins nothing.
// Names come from the profile service, resolved by id so that an actor whose
// event carries no organisation, or who has since moved, still resolves.
// Cached for the life of the page; a failed lookup is not fatal, the caller
// falls back to the short id.
const known = new Map<string, string>();

// The endpoint takes at most 200 ids per call.
const BATCH = 200;

/** actor id -> display name, for every actor the given events name. */
export async function resolveActorNames(
  events: AuditEvent[],
): Promise<Map<string, string>> {
  const missing = [
    ...new Set(
      events
        .map((e) => e.userId)
        .filter((id): id is string => !!id && !known.has(id)),
    ),
  ];

  for (let i = 0; i < missing.length; i += BATCH) {
    try {
      const found = await client.resolveUserNames(missing.slice(i, i + BATCH));
      for (const { id, name } of found) known.set(id, name);
    } catch {
      break;
    }
  }

  return new Map(known);
}
