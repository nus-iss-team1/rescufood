import "server-only";

import type {
  InAppNotification,
  NotificationList,
} from "@/lib/notification-types";

// Thin server-side client for the notification service's read API. Callers
// pass the Cognito ID token from the session; it never reaches the browser.

const base = process.env.NOTIFICATION_API_URL ?? "http://localhost:3003";

export type { InAppNotification, NotificationList };

export class NotificationsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "NotificationsApiError";
  }
}

async function call<T>(
  idToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${base}/api/notifications${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${idToken}`, ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new NotificationsApiError(
      `notification service responded ${res.status}`,
      res.status,
    );
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export function listNotifications(
  idToken: string,
  opts: { unreadOnly?: boolean; limit?: number } = {},
): Promise<NotificationList> {
  const q = new URLSearchParams();
  if (opts.unreadOnly) q.set("unreadOnly", "true");
  if (opts.limit) q.set("limit", String(opts.limit));
  const qs = q.toString();
  return call(idToken, qs ? `?${qs}` : "");
}

export function unreadCount(idToken: string): Promise<{ count: number }> {
  return call(idToken, "/unread-count");
}

export function markNotificationRead(
  idToken: string,
  id: string,
): Promise<{ id: string; readAt: string }> {
  return call(idToken, `/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead(
  idToken: string,
): Promise<{ updated: number }> {
  return call(idToken, "/read-all", { method: "POST" });
}

export function deleteNotification(
  idToken: string,
  id: string,
): Promise<void> {
  return call(idToken, `/${id}`, { method: "DELETE" });
}

export function deleteAllNotifications(
  idToken: string,
): Promise<{ deleted: number }> {
  return call(idToken, "", { method: "DELETE" });
}
