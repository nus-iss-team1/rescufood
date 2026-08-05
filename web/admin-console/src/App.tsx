import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { api, ApiError } from "./api";
import { getToken, signOut } from "./auth";
import { LoginForm } from "./LoginForm";
import { OrgQueue } from "./OrgQueue";
import type { Me } from "./types";

export default function App() {
  const [authed, setAuthed] = useState(() => getToken() !== null);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

  const loadMe = useCallback(async () => {
    setError("");
    try {
      setMe(await api<Me>("/me"));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        signOut();
        setAuthed(false);
        return;
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
    setAuthed(false);
  }

  if (!authed) {
    return <LoginForm onSignedIn={() => setAuthed(true)} />;
  }

  if (error || (me && !me.is_admin)) {
    return (
      <main className="grid min-h-svh place-items-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-destructive">
              {error || `${me?.name || me?.email} is not a platform administrator.`}
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
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Organisation approvals</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{me.name || me.email}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>
      <OrgQueue />
    </main>
  );
}
