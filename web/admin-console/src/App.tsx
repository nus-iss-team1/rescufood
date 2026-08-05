import { useCallback, useEffect, useState } from "react";
import type { Me } from "@rescufood/profile-sdk";

import { Button } from "@rescufood/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@rescufood/ui/components/card";

import { client, ApiError } from "./api";
import { getToken, signOut } from "./auth";
import { HeaderBar } from "./HeaderBar";
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
      <>
        <HeaderBar onSignOut={logout} />
        <main className="grid place-items-center p-4 pt-16">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Can&apos;t reach the profile service</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-sm text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground">
                Make sure the profile service is running (make dev), then
                retry.
              </p>
              <Button onClick={() => void loadMe()}>Retry</Button>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  if (me && !me.is_admin) {
    return (
      <>
        <HeaderBar user={me.name || me.email} onSignOut={logout} />
        <main className="grid place-items-center p-4 pt-16">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Access denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive">
                {me.name || me.email} is not a platform administrator.
              </p>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  if (!me) {
    return (
      <>
        <HeaderBar onSignOut={logout} />
        <main className="grid place-items-center p-4 pt-16">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <HeaderBar user={me.name || me.email} onSignOut={logout} />
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <h1 className="mb-6 text-lg font-semibold sm:text-xl">
          Organisation approvals
        </h1>
        <OrgQueue />
      </main>
    </>
  );
}
