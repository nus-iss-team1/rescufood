import type { AuditEvent } from "@rescufood/listings-sdk";

// Badge tone per audit action. Keyed on the event half of `<entity>.<event>`
// so a new action inherits a sensible default rather than breaking the table.
const toneByEvent: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  created: "default",
  published: "default",
  updated: "secondary",
  unpublished: "secondary",
  generated: "secondary",
  collected: "success",
  completed: "success",
  approved: "success",
  reactivated: "success",
  unlocked: "success",
  login_succeeded: "success",
  login_failed: "warning",
  account_locked: "destructive",
  cancelled: "destructive",
  deleted: "destructive",
  no_show: "destructive",
  exhausted: "destructive",
  suspended: "destructive",
  rejected: "destructive",
  idempotency_conflict: "warning",
  expired: "outline",
};

export function actionTone(action: string) {
  return toneByEvent[action.split(".").at(-1) ?? ""] ?? "outline";
}

// Actions read better as "Listing published" than "listing.published".
export function actionLabel(action: string): string {
  const [entity, ...rest] = action.split(".");
  const event = rest.join(".").replaceAll("_", " ");
  const head = `${entity.charAt(0).toUpperCase()}${entity.slice(1)}`;
  return event ? `${head} ${event}` : head;
}

// Enough of a uuid to recognise and to copy-match against, without the width.
export function shortId(id: string): string {
  return id.slice(0, 8);
}

/** What the event points at: the entity's short id, or the subject it names. */
export function targetLabel(event: AuditEvent): string {
  if (event.entityId) return shortId(event.entityId);
  return event.subject ?? "unknown";
}

/** The listing a claim or pickup event belongs to, when the event names one. */
export function listingIdOf(event: AuditEvent): string | null {
  const value = event.metadata?.listingId;
  return typeof value === "string" ? value : null;
}
