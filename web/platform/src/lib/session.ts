import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/auth";

/** Matches the plain, __Secure- and chunked session cookie names. */
const SESSION_COOKIE = "authjs.session-token";

async function hasSessionCookie() {
  const jar = await cookies();
  return jar.getAll().some((c) => c.name.includes(SESSION_COOKIE));
}

/**
 * Returns the signed-in session. A leftover session cookie means the
 * session expired, which routes through the notice page; otherwise the
 * visitor was never signed in and goes straight to /login.
 */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (session?.user) return session;
  redirect((await hasSessionCookie()) ? "/session-expired" : "/login");
}
