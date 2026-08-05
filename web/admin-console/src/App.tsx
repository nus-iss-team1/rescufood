import { useCallback, useEffect, useState } from "react";
import type { Me } from "@rescufood/profile-sdk";

import { Button } from "@rescufood/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@rescufood/ui/components/card";

import { client, ApiError } from "./api";
import { getToken, signOut } from "./auth";
import { LoginForm } from "./LoginForm";
import { OrgQueue } from "./OrgQueue";

export default function App() {
  const [authed, setAuthed] = useState(() => getToken() !== null);
  const [notice, setNotice] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const onExpired = () => {
      setMe(null);
      setAuthed(false);
      setNotice("Your session has expired. Please sign in again.");
    };
    window.addEventListener("admin:session-expired", onExpired);
    return () => window.removeEventListener("admin:session-expired", onExpired);
  }, []);

  const loadMe = useCallback(async () => {
    setError("");
    try {
      setMe(await client.getMe());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return; // onUnauthorized already signed us out
      }
      setError(err instanceof Error ? err.message : "failed to load profile");
    }
  }, []);

  useEffect(() => {
    if (authed) void loadMe();
  }, [authed, loadMe]);

  function logout() {
    signOut();
    setMe(null);
    setNotice("");
    setAuthed(false);
  }

  if (!authed) {
    return (
      <LoginForm
        notice={notice}
        onSignedIn={() => {
          setNotice("");
          setAuthed(true);
        }}
      />
    );
  }

  if (error) {
    return (
      <main className="grid min-h-svh place-items-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Can&apos;t reach the profile service</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-sm text-muted-foreground">
              Make sure the profile service is running (make dev), then retry.
            </p>
            <Button onClick={() => void loadMe()}>Retry</Button>
            <Button variant="outline" onClick={logout}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (me && !me.is_admin) {
    return (
      <main className="grid min-h-svh place-items-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-destructive">
              {me.name || me.email} is not a platform administrator.
            </p>
            <Button variant="outline" onClick={logout}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="grid min-h-svh place-items-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold sm:text-xl">
          Organisation approvals
        </h1>
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate text-sm text-muted-foreground">
            {me.name || me.email}
          </span>
          <Button variant="outline" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>
      <OrgQueue />
    </main>
  );
}
