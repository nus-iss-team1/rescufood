"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "@rescufood/ui/components/sonner";

import { changePasswordAction, type PasswordFormState } from "@/app/actions";
import { Button } from "@rescufood/ui/components/button";
import { Input } from "@rescufood/ui/components/input";
import { Label } from "@rescufood/ui/components/label";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordFormState, FormData>(
    changePasswordAction,
    {}
  );
  // Each submission returns a new state object, so identity tells us
  // whether this result has already been announced.
  const announced = useRef<PasswordFormState | null>(null);

  useEffect(() => {
    if (state === announced.current) return;
    if (state.done) {
      toast.success("Password updated", {
        description: "Use it the next time you sign in.",
      });
    } else if (state.error) {
      toast.error(state.error);
    } else {
      return;
    }
    announced.current = state;
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="current_password">Current password</Label>
        <Input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="new_password">New password</Label>
        <Input
          id="new_password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters with upper- and lowercase letters and a
          number.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm_password">Confirm new password</Label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}
