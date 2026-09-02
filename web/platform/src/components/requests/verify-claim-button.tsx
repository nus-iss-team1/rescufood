"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { PickupCodeMatch } from "@rescufood/listings-sdk";
import { lookupPickupCodeAction } from "@/app/requests/actions";
import { quantity } from "@/lib/listing-labels";
import { Button } from "@rescufood/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rescufood/ui/components/dialog";
import { OtpInput } from "./otp-input";

/** Resolves a pickup code to its claim, then opens it once confirmed. */
export function VerifyClaimButton({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [match, setMatch] = useState<PickupCodeMatch | null>(null);

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setMatch(null);
      setError("");
    }
  };

  const lookup = (formData: FormData) => {
    setChecking(true);
    setError("");
    lookupPickupCodeAction(String(formData.get("code") ?? ""))
      .then((res) => {
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          setMatch(res.data);
        }
      })
      .catch(() => setError("Could not check that code."))
      .finally(() => setChecking(false));
  };

  return (
    <>
      <Button type="button" className={className} onClick={() => setOpen(true)}>
        Verify claim
      </Button>

      <Dialog open={open} onOpenChange={reset}>
        <DialogContent className="sm:max-w-sm">
          {match ? (
            <>
              <DialogHeader>
                <DialogTitle>Is this pickup complete?</DialogTitle>
                <DialogDescription>
                  {match.listingDescription ?? "This lot"} —{" "}
                  {quantity(match.requestedQuantity, match.unit ?? "").trim()}{" "}
                  claimed. Opening the claim lets you confirm the handover.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => reset(false)}>
                  Not yet
                </Button>
                <Button
                  onClick={() => router.push(`/requests/${match.requestId}`)}
                >
                  Open claim
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Verify a claim</DialogTitle>
                <DialogDescription>
                  Enter the 6-digit code the rescue partner is showing you.
                </DialogDescription>
              </DialogHeader>
              <form action={lookup} className="space-y-4">
                <OtpInput name="code" />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reset(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={checking}>
                    {checking ? "Checking..." : "Check code"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
