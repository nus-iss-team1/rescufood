import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  deleteAllNotifications,
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationsApiError,
  unreadCount,
} from "@/lib/notifications";

// Same-origin proxy for the bell: the browser polls this, it attaches the
// session's Cognito token and forwards to the notification service. Lives
// under /notifications/* (not /api/notifications/*) so it isn't shadowed by
// the ALB rule that routes /api/notifications* to the backend.
export const dynamic = "force-dynamic";

async function idToken(): Promise<string | null> {
  const session = await auth();
  return session?.idToken ?? null;
}

const unauthorized = NextResponse.json(
  { error: "unauthenticated" },
  { status: 401 },
);

export async function GET(request: Request): Promise<NextResponse> {
  const token = await idToken();
  if (!token) return unauthorized;

  const view = new URL(request.url).searchParams.get("view");
  try {
    if (view === "count") {
      const { count } = await unreadCount(token);
      return NextResponse.json({ unreadCount: count });
    }
    return NextResponse.json(await listNotifications(token));
  } catch {
    return NextResponse.json({ error: "unreachable" }, { status: 502 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const token = await idToken();
  if (!token) return unauthorized;

  const body = (await request.json().catch(() => ({}))) as {
    read?: string;
    readAll?: boolean;
  };
  try {
    if (body.readAll) {
      await markAllNotificationsRead(token);
    } else if (body.read) {
      await markNotificationRead(token, body.read);
    }
    return NextResponse.json(await listNotifications(token));
  } catch {
    return NextResponse.json({ error: "unreachable" }, { status: 502 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const token = await idToken();
  if (!token) return unauthorized;

  // No id -> clear the whole feed.
  const id = new URL(request.url).searchParams.get("id");
  try {
    if (id) {
      // Deleting one that's already gone is the outcome the caller wanted.
      await deleteNotification(token, id).catch((err: unknown) => {
        if (err instanceof NotificationsApiError && err.status === 404) return;
        throw err;
      });
    } else {
      await deleteAllNotifications(token);
    }
    return NextResponse.json(await listNotifications(token));
  } catch {
    return NextResponse.json({ error: "unreachable" }, { status: 502 });
  }
}
