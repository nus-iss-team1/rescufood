"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { PickupCodeMatch } from "@rescufood/listings-sdk";
import {
  lookupPickupCodeAction,
  verifyPickupCodeAction,
} from "@/app/requests/actions";
import { quantity } from "@/lib/listing-labels";
import { Button } from "@rescufood/ui/components/button";
import { toast } from "@rescufood/ui/components/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rescufood/ui/components/dialog";
import { OtpInput } from "./otp-input";

/** Resolves a pickup code to its claim and completes the pickup. */
export function VerifyClaimButton({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [match, setMatch] = useState<PickupCodeMatch | null>(null);
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState(false);

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setMatch(null);
      setCode("");
      setError("");
    }
  };

  const lookup = (formData: FormData) => {
    const entered = String(formData.get("code") ?? "");
    setChecking(true);
    setError("");
    lookupPickupCodeAction(entered)
      .then((res) => {
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          setCode(entered);
          setMatch(res.data);
        }
      })
      .catch(() => setError("Could not check that code."))
      .finally(() => setChecking(false));
  };

  const confirm = () => {
    if (!match) return;
    setConfirming(true);
    setError("");
    const formData = new FormData();
    formData.set("requestId", match.requestId);
    formData.set("code", code);
    verifyPickupCodeAction({}, formData)
      .then((res) => {
        if (res.error) {
          setError(res.error);
          return;
        }
        toast.success("Pickup confirmed", {
          description: "The lot is marked as collected.",
        });
        reset(false);
        router.push(`/requests/${match.requestId}`);
      })
      .catch(() => setError("Could not confirm the pickup."))
      .finally(() => setConfirming(false));
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
                  claimed. Confirming records the handover as collected.
                </DialogDescription>
              </DialogHeader>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => reset(false)}>
                  Not yet
                </Button>
                <Button onClick={confirm} disabled={confirming}>
                  {confirming ? "Confirming..." : "Confirm pickup"}
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
