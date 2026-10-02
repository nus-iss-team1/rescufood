import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markNotificationRead, NotificationsApiError } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  const token = session?.idToken;
  if (!token) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  try {
    const result = await markNotificationRead(token, id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotificationsApiError && err.status === 404) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "unreachable" }, { status: 502 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  return PATCH(request, context);
}
