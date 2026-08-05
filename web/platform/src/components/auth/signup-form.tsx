"use client";

import { useActionState, useState } from "react";

import {
  confirmSignUpAction,
  resendCodeAction,
  signUpAction,
  type FormState,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function DetailsStep({
  state,
  action,
  pending,
}: {
  state: FormState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <div data-animate="field" className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="yourusername"
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z0-9._\-]+"
          required
        />
        <p className="text-xs text-muted-foreground">
          3-32 characters: letters, numbers, dots, dashes, underscores.
        </p>
      </div>
      <div data-animate="field" className="flex flex-col gap-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>
      <div data-animate="field" className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@organisation.org"
          required
        />
      </div>
      <div data-animate="field" className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters with upper- and lowercase letters and a
          number.
        </p>
      </div>
      <fieldset data-animate="field" className="flex flex-col gap-2">
        <legend className="text-sm font-medium">I&apos;m joining as</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors has-checked:border-foreground has-checked:bg-muted">
            <input type="radio" name="role" value="donor" className="sr-only" defaultChecked />
            Food donor
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors has-checked:border-foreground has-checked:bg-muted">
            <input type="radio" name="role" value="rescue-partner" className="sr-only" />
            Rescue partner
          </label>
        </div>
      </fieldset>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}

function ConfirmStep({
  state,
  password,
}: {
  state: FormState;
  password: string;
}) {
  const [confirmState, confirmAction, confirmPending] = useActionState<
    FormState,
    FormData
  >(confirmSignUpAction, state);
  const [resendState, resendAction, resendPending] = useActionState<
    FormState,
    FormData
  >(resendCodeAction, {});
  const message = confirmState.error ?? resendState.error;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        We emailed a verification code to{" "}
        <span className="font-medium text-foreground">{state.email}</span>.
        Enter it below to verify and activate{" "}
        <span className="font-medium text-foreground">{state.username}</span>.
      </p>
      <form action={confirmAction} className="flex flex-col gap-5">
        <input type="hidden" name="username" value={state.username ?? ""} />
        <input type="hidden" name="password" value={password} />
        <div data-animate="field" className="flex flex-col gap-2">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            required
          />
        </div>
        {message ? (
          <p role="alert" className="text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={confirmPending} className="w-full">
          {confirmPending ? "Verifying..." : "Verify & sign in"}
        </Button>
      </form>
      <form action={resendAction} className="text-center">
        <input type="hidden" name="username" value={state.username ?? ""} />
        <Button type="submit" variant="ghost" size="sm" disabled={resendPending}>
          Resend code
        </Button>
      </form>
    </div>
  );
}

export function SignupForm() {
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState<FormState, FormData>(
    signUpAction,
    { step: "details" }
  );

  // Captures the password at submit time; ConfirmStep reuses it to sign
  // in right after verification.
  function submit(formData: FormData) {
    setPassword(String(formData.get("password") ?? ""));
    action(formData);
  }

  if (state.step === "confirm") {
    return <ConfirmStep state={state} password={password} />;
  }

  return <DetailsStep state={state} action={submit} pending={pending} />;
}
