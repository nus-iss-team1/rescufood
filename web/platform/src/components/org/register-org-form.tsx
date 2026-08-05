"use client";

import { useActionState } from "react";

import { registerOrgAction, type OrgFormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterOrgForm() {
  const [state, action, pending] = useActionState<OrgFormState, FormData>(
    registerOrgAction,
    {}
  );

  if (state.domain) {
    return (
      <div className="flex flex-col">
        <p className="text-sm text-muted-foreground">
          An administrator will review your organisation. Once it is
          approved, anyone with an{" "}
          <span className="font-medium text-foreground">@{state.domain}</span>{" "}
          email address can create an account and will join your
          organisation automatically.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-name">Organisation name</Label>
        <Input
          id="org-name"
          name="name"
          minLength={2}
          maxLength={100}
          placeholder="Fresh Mart Pte Ltd"
          required
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Organisation type</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors has-checked:border-foreground has-checked:bg-muted">
            <input
              type="radio"
              name="type"
              value="donor"
              className="sr-only"
              defaultChecked
            />
            Food donor
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors has-checked:border-foreground has-checked:bg-muted">
            <input
              type="radio"
              name="type"
              value="rescue_partner"
              className="sr-only"
            />
            Rescue partner
          </label>
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="org-domain">Email domain</Label>
        <Input id="org-domain" name="domain" placeholder="freshmart.sg" required />
        <p className="text-xs text-muted-foreground">
          Your team signs up with email addresses on this domain once the
          organisation is approved.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="org-email">Contact email</Label>
        <Input
          id="org-email"
          name="contact_email"
          type="email"
          placeholder="ops@freshmart.sg"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="org-phone">Contact phone (optional)</Label>
        <Input id="org-phone" name="contact_phone" type="tel" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="org-address">Address (optional)</Label>
        <Input id="org-address" name="address" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="org-description">Description (optional)</Label>
        <textarea
          id="org-description"
          name="description"
          rows={3}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Submitting..." : "Register organisation"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        An administrator reviews every registration before accounts can be
        created.
      </p>
    </form>
  );
}
