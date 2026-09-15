"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Clock } from "lucide-react";

import type { Listing, ListingRequest, PickupCode } from "@rescufood/listings-sdk";
import { getPickupCredentialAction, verifyPickupCodeAction } from "@/app/requests/actions";
import { Button } from "@rescufood/ui/components/button";
import { Input } from "@rescufood/ui/components/input";
import { Label } from "@rescufood/ui/components/label";
import { toast } from "@rescufood/ui/components/sonner";
import { quantity } from "@/lib/listing-labels";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rescufood/ui/components/dialog";
import { OtpInput } from "./otp-input";

export function PickupVerification({
  request,
  isDonor,
  listing,
}: {
  request: ListingRequest;
  isDonor: boolean;
  listing?: Listing;
}) {
  const router = useRouter();
  const unit = listing?.unit ?? "units";
  const defaultQuantity = request.requestedQuantity
    ? request.requestedQuantity.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1")
    : "1";

  const [codeOpen, setCodeOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [credential, setCredential] = useState<PickupCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Donor verification state
  const [code, setCode] = useState("");
  const [collectedQuantity, setCollectedQuantity] = useState(defaultQuantity);
  const [confirmStep, setConfirmStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const resetVerifyModal = (open: boolean) => {
    setVerifyOpen(open);
    if (!open) {
      setCode("");
      setCollectedQuantity(defaultQuantity);
      setConfirmStep(false);
      setVerifyError("");
      setSubmitting(false);
    }
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError("");

    const cleanCode = code.trim();
    if (!cleanCode || !/^\d{6}$/.test(cleanCode)) {
      setVerifyError("Please enter the 6-digit pickup code.");
      return;
    }

    const qty = Number(collectedQuantity);
    if (!collectedQuantity.trim() || !Number.isFinite(qty) || qty <= 0) {
      setVerifyError("Collected quantity must be greater than zero.");
      return;
    }

    if (qty > Number(request.requestedQuantity)) {
      setVerifyError(
        `Collected quantity cannot exceed requested ${quantity(request.requestedQuantity, unit)}.`
      );
      return;
    }

    setConfirmStep(true);
  };

  const handleConfirmPickup = async () => {
    setSubmitting(true);
    setVerifyError("");

    const formData = new FormData();
    formData.set("requestId", request.id);
    formData.set("code", code.trim());
    formData.set("collectedQuantity", collectedQuantity.trim());

    try {
      const result = await verifyPickupCodeAction({}, formData);
      if (result.error) {
        setVerifyError(result.error);
        toast.error("Pickup not confirmed", { description: result.error });
        setSubmitting(false);
        return;
      }

      toast.success("Pickup confirmed", {
        description: "The lot is marked as collected.",
      });
      resetVerifyModal(false);
      router.refresh();
    } catch {
      setVerifyError("Could not reach the server. Please try again.");
      toast.error("Pickup not confirmed", {
        description: "Network error. Please try again.",
      });
      setSubmitting(false);
    }
  };

  const waiting =
    isDonor && request.status === "active" && !request.codeGeneratedBy;
  const awaitingVerification =
    !isDonor && request.status === "active" && !!request.codeGeneratedBy;

  // Polls for the code the partner generates, and for the donor's
  // verification, each in the other party's session.
  useEffect(() => {
    if (!waiting && !awaitingVerification) return;
    const id = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(id);
  }, [waiting, awaitingVerification, router]);

  const generate = (regenerate = false) => {
    setLoading(true);
    setError("");
    getPickupCredentialAction(request.id, regenerate)
      .then((res) => {
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          setCredential(res.data);
        }
      })
      .catch(() => setError("Failed to load pickup code."))
      .finally(() => setLoading(false));
  };

  const showCode = () => {
    setCodeOpen(true);
    if (credential || loading) return;
    generate();
  };

  // The code is not returned on a read, so a live one is fetched back
  // idempotently; minting the first code stays an explicit action.
  const hasLiveCode =
    !!request.codeExpiresAt && dayjs(request.codeExpiresAt).isAfter(dayjs());
  useEffect(() => {
    if (!isDonor && request.status === "active" && hasLiveCode && !credential) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      generate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDonor, request.id, request.status, hasLiveCode]);

  const regenAvailableMs = credential
    ? dayjs(credential.regenerateAvailableAt).valueOf()
    : 0;
  const regenSecondsLeft = Math.max(
    0,
    Math.ceil((regenAvailableMs - nowMs) / 1000),
  );

  // Ticks while the regenerate cooldown counts down.
  useEffect(() => {
    if (regenAvailableMs <= Date.now()) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
      if (Date.now() >= regenAvailableMs) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [regenAvailableMs]);

  // Only an active claim has a live pickup code.
  if (request.status !== "active") {
    return null;
  }

  return (
    <>
      {isDonor ? (
        waiting ? (
          <Button size="sm" variant="outline" disabled>
            Waiting for partner&apos;s code
          </Button>
        ) : (
          <Button size="sm" onClick={() => setVerifyOpen(true)}>
            Enter pickup code
          </Button>
        )
      ) : (
        <Button size="sm" onClick={showCode}>
          {request.codeGeneratedBy ? "Show pickup code" : "Generate pickup code"}
        </Button>
      )}

      {isDonor ? (
        <Dialog open={verifyOpen} onOpenChange={resetVerifyModal}>
          <DialogContent className="sm:max-w-md">
            {!confirmStep ? (
              <>
                <DialogHeader>
                  <DialogTitle>Confirm pickup</DialogTitle>
                  <DialogDescription>
                    Enter the rescue partner&apos;s code and verify the collected quantity.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleProceedToConfirm} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Verification code</Label>
                    <OtpInput
                      name="code"
                      value={code}
                      onChange={(val) => {
                        setCode(val);
                        setVerifyError("");
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="collectedQuantity">Actual collected quantity</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="collectedQuantity"
                        name="collectedQuantity"
                        type="number"
                        step="any"
                        min="0.01"
                        max={Number(request.requestedQuantity)}
                        value={collectedQuantity}
                        onChange={(e) => {
                          setCollectedQuantity(e.target.value);
                          setVerifyError("");
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
                      Claimed: {quantity(request.requestedQuantity, unit)}
                    </p>
                  </div>

                  {verifyError && (
                    <p className="text-sm text-destructive">{verifyError}</p>
                  )}

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => resetVerifyModal(false)}
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
                        {collectedQuantity} {unit}
                      </span>{" "}
                      to <span className="font-semibold text-foreground">Rescue Partner</span>?
                    </p>
                    <div className="text-xs text-muted-foreground border-t border-border/60 pt-2 space-y-1">
                      <div>
                        <span className="font-medium text-foreground">Lot:</span>{" "}
                        {listing?.description || "Food item"}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Code:</span>{" "}
                        <span className="font-mono font-medium">{code}</span>
                      </div>
                    </div>
                  </div>

                  {verifyError && (
                    <p className="text-sm text-destructive">{verifyError}</p>
                  )}

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setConfirmStep(false);
                        setVerifyError("");
                      }}
                      disabled={submitting}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={handleConfirmPickup}
                      disabled={submitting}
                    >
                      {submitting ? "Confirming..." : "Confirm handover"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      ) : (
        <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Your pickup code</DialogTitle>
              <DialogDescription>
                Present this to the donor at the pickup location.
              </DialogDescription>
            </DialogHeader>
            {loading && !credential ? (
              <div className="h-20 w-full animate-pulse rounded-xl bg-muted" />
            ) : credential ? (
              <div className="space-y-4">
                <div className="select-all rounded-xl border border-border px-6 py-4 text-center font-mono text-3xl font-bold tracking-widest">
                  {credential.code}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" />
                  <span>
                    Expires {dayjs(credential.expiresAt).format("MMM D, h:mm a")}
                  </span>
                </div>
                {error && (
                  <p className="text-center text-sm text-destructive">{error}</p>
                )}
                <Button
                  variant="outline"
                  onClick={() => generate(true)}
                  disabled={loading || regenSecondsLeft > 0}
                  className="w-full"
                >
                  {regenSecondsLeft > 0
                    ? `Generate new code (${regenSecondsLeft}s)`
                    : "Generate new code"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <Button onClick={() => generate()} className="w-full">
                  {error ? "Retry Generation" : "Generate Pickup Code"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
