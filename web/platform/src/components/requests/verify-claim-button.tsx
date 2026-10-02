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
import { Input } from "@rescufood/ui/components/input";
import { Label } from "@rescufood/ui/components/label";
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
  const [actualQuantity, setActualQuantity] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setMatch(null);
      setCode("");
      setActualQuantity("");
      setConfirmStep(false);
      setError("");
      setConfirming(false);
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
          const defaultQty = res.data.requestedQuantity
            ? res.data.requestedQuantity.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1")
            : "1";
          setActualQuantity(defaultQty);
          setConfirmStep(false);
          setError("");
        }
      })
      .catch(() => setError("Could not check that code."))
      .finally(() => setChecking(false));
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!match) return;

    const unit = match.unit ?? "units";
    const qty = Number(actualQuantity);
    if (!actualQuantity.trim() || !Number.isFinite(qty) || qty <= 0) {
      setError("Collected quantity must be greater than zero.");
      return;
    }

    if (qty > Number(match.requestedQuantity)) {
      setError(
        `Collected quantity cannot exceed claimed ${quantity(match.requestedQuantity, unit)}.`
      );
      return;
    }

    setConfirmStep(true);
  };

  const confirm = () => {
    if (!match) return;
    setConfirming(true);
    setError("");
    const formData = new FormData();
    formData.set("requestId", match.requestId);
    formData.set("code", code);
    formData.set("collectedQuantity", actualQuantity.trim());
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

  const unit = match?.unit ?? "units";

  return (
    <>
      <Button type="button" className={className} onClick={() => setOpen(true)}>
        Verify claim
      </Button>

      <Dialog open={open} onOpenChange={reset}>
        <DialogContent className="sm:max-w-md">
          {match ? (
            !confirmStep ? (
              <>
                <DialogHeader>
                  <DialogTitle>Verify claim</DialogTitle>
                  <DialogDescription>
                    {match.listingDescription ?? "This lot"} — claimed:{" "}
                    {quantity(match.requestedQuantity, unit).trim()}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleProceedToConfirm} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-actual-qty">Actual collected quantity</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="quick-actual-qty"
                        name="collectedQuantity"
                        type="number"
                        step="any"
                        min="0.01"
                        max={Number(match.requestedQuantity)}
                        value={actualQuantity}
                        onChange={(e) => {
                          setActualQuantity(e.target.value);
                          setError("");
                        }}
                        className="flex-1"
                        placeholder="Enter quantity"
                        required
                      />
                      <span className="text-sm font-medium text-muted-foreground shrink-0">
                        {unit}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Claimed: {quantity(match.requestedQuantity, unit)}
                    </p>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => reset(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Review handover
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Confirm Handover</DialogTitle>
                  <DialogDescription>
                    Please verify the details below before finalizing collection.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Confirm handover of{" "}
                      <span className="font-semibold text-foreground">
                        {actualQuantity} {unit}
                      </span>{" "}
                      to <span className="font-semibold text-foreground">Rescue Partner</span>?
                    </p>
                    <div className="text-xs text-muted-foreground border-t border-border/60 pt-2 space-y-1">
                      <div>
                        <span className="font-medium text-foreground">Lot:</span>{" "}
                        {match.listingDescription ?? "Food item"}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Code:</span>{" "}
                        <span className="font-mono font-medium">{code}</span>
                      </div>
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setConfirmStep(false);
                        setError("");
                      }}
                      disabled={confirming}
                    >
                      Back
                    </Button>
                    <Button onClick={confirm} disabled={confirming}>
                      {confirming ? "Confirming..." : "Confirm handover"}
                    </Button>
                  </div>
                </div>
              </>
            )
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
