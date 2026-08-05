"use client";

import { useActionState } from "react";

import { loginAction, type FormState } from "@/app/actions";
import { Button } from "@rescufood/ui/components/button";
import { Input } from "@rescufood/ui/components/input";
import { Label } from "@rescufood/ui/components/label";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    loginAction,
    {}
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <div data-animate="field" className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="yourusername"
          required
        />
      </div>
      <div data-animate="field" className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New to RescuFood?{" "}
        <a href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create an account
        </a>
      </p>
    </form>
  );
}
