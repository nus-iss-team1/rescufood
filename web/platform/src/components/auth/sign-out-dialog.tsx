"use client";

import { useState } from "react";

import { signOutAction } from "@/app/actions";
import { Button } from "@rescufood/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rescufood/ui/components/dialog";

/** Controlled confirmation, for callers that own the open state. */
export function SignOutConfirm({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign out?</DialogTitle>
          <DialogDescription>
            You will need to sign in again to reach your workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <form action={signOutAction}>
            <Button type="submit" className="w-full sm:w-auto">
              Sign out
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Trigger that owns its own confirmation dialog. */
export function SignOutButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Sign out
      </button>
      <SignOutConfirm open={open} onOpenChange={setOpen} />
    </>
  );
}
