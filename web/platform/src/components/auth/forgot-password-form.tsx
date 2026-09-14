"use client";

import { useActionState } from "react";

import {
  confirmPasswordResetAction,
  requestPasswordResetAction,
  type ResetFormState,
} from "@/app/actions";
import { Button } from "@rescufood/ui/components/button";
import { Input } from "@rescufood/ui/components/input";
import { Label } from "@rescufood/ui/components/label";

function RequestStep({
  state,
  action,
  pending,
}: {
  state: ResetFormState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <div data-animate="field" className="flex flex-col gap-2">
        <Label htmlFor="username">Username or email</Label>
        <Input id="username" name="username" autoComplete="username" required />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-muted-foreground">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Sending..." : "Send reset code"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <a href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}

function ConfirmStep({ state }: { state: ResetFormState }) {
  const [confirmState, confirmAction, confirmPending] = useActionState<
    ResetFormState,
    FormData
  >(confirmPasswordResetAction, state);
  const [requestState, requestAction, requestPending] = useActionState<
    ResetFormState,
    FormData
  >(requestPasswordResetAction, {});

  if (confirmState.done) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">
          Your password has been reset. You can sign in with your new
          password now.
        </p>
        <a href="/login">
          <Button size="lg" className="w-full">
            Back to sign in
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Enter the code we sent to{" "}
        <span className="font-medium text-foreground">{state.username}</span>{" "}
        along with your new password.
      </p>
      <form action={confirmAction} className="flex flex-col gap-5">
        <input type="hidden" name="username" value={state.username ?? ""} />
        <div data-animate="field" className="flex flex-col gap-2">
          <Label htmlFor="code">Reset code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            required
          />
        </div>
        <div data-animate="field" className="flex flex-col gap-2">
          <Label htmlFor="password">New password</Label>
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
        <div data-animate="field" className="flex flex-col gap-2">
          <Label htmlFor="confirm_password">Confirm new password</Label>
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        {confirmState.error ? (
          <p role="alert" className="text-sm text-destructive">
            {confirmState.error}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={confirmPending} className="w-full">
          {confirmPending ? "Resetting..." : "Reset password"}
        </Button>
      </form>
      <form action={requestAction} className="text-center">
        <input type="hidden" name="username" value={state.username ?? ""} />
        <Button type="submit" variant="ghost" size="sm" disabled={requestPending}>
          {requestState.step === "confirm" ? "New code sent" : "Send a new code"}
        </Button>
      </form>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ResetFormState, FormData>(
    requestPasswordResetAction,
    { step: "request" }
  );

  if (state.step === "confirm") {
    return <ConfirmStep state={state} />;
  }

  return <RequestStep state={state} action={action} pending={pending} />;
}
