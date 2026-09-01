"use client";

import { useActionState, useEffect, useState } from "react";
import dayjs from "dayjs";
import { useFormStatus } from "react-dom";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

import type { ListingRequest, PickupCode } from "@rescufood/listings-sdk";
import { getPickupCredentialAction, verifyPickupCodeAction } from "@/app/requests/actions";
import { Button } from "@rescufood/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { Input } from "@rescufood/ui/components/input";
import { Label } from "@rescufood/ui/components/label";
import { AnimateIn } from "@/components/animate-in";

function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? "Verifying..." : children}
    </Button>
  );
}

export function PickupCredentialCard({
  request,
  isDonor,
}: {
  request: ListingRequest;
  isDonor: boolean;
}) {
  const [credential, setCredential] = useState<PickupCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [verifyState, verifyAction] = useActionState(verifyPickupCodeAction, {});

  const handleGenerate = (regenerate = false) => {
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

  // The partner's code isn't returned on GET. If a live one exists, fetch it
  // (idempotently) on open so a reload restores the code and an accurate
  // cooldown; generating the first code stays an explicit action.
  const hasLiveCode =
    !!request.codeExpiresAt && dayjs(request.codeExpiresAt).isAfter(dayjs());
  useEffect(() => {
    if (!isDonor && request.status === "active" && hasLiveCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleGenerate(false);
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

  // Tick once a second while the regenerate cooldown is counting down.
  useEffect(() => {
    if (regenAvailableMs <= Date.now()) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
      if (Date.now() >= regenAvailableMs) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [regenAvailableMs]);

  if (request.status === "cancelled") {
    return (
      <AnimateIn>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <XCircle className="size-5 shrink-0" />
              <p className="font-medium text-sm">Reservation cancelled — pickup code is no longer valid.</p>
            </div>
          </CardContent>
        </Card>
      </AnimateIn>
    );
  }

  if (request.status === "completed") {
    return (
      <AnimateIn>
        <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-success">
              <CheckCircle2 className="size-5 shrink-0" />
              <p className="font-medium text-sm">Pickup completed — handover verified.</p>
            </div>
          </CardContent>
        </Card>
      </AnimateIn>
    );
  }

  // Only an active claim has a live pickup code.
  if (request.status !== "active") {
    return null;
  }

  return (
    <AnimateIn>
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Pickup Verification</CardTitle>
          <CardDescription>
            {isDonor
              ? "Enter the 6-digit verification code provided by the rescue partner to complete the handover."
              : "Present this 6-digit verification code to the donor at the pickup location to complete the handover."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isDonor ? (
            <div className="space-y-4">
              {loading && !credential ? (
                <div className="animate-pulse rounded-xl bg-muted h-20 w-full" />
              ) : credential ? (
                <div className="space-y-4">
                  <div className="tracking-widest text-3xl font-mono font-bold bg-muted px-6 py-4 rounded-xl border border-border text-center select-all">
                    {credential.code}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="size-4" />
                    <span>Expires {dayjs(credential.expiresAt).format("MMM D, h:mm a")}</span>
                  </div>
                  {error && (
                    <p className="text-sm text-destructive text-center">{error}</p>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleGenerate(true)}
                    disabled={loading || regenSecondsLeft > 0}
                    className="w-full"
                  >
                    {regenSecondsLeft > 0
                      ? `Generate New Code (${regenSecondsLeft}s)`
                      : "Generate New Code"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {error && (
                    <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <Button onClick={() => handleGenerate()} className="w-full">
                    {error ? "Retry Generation" : "Generate Pickup Code"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <form action={verifyAction} className="space-y-4">
              <input type="hidden" name="requestId" value={request.id} />
              <div className="space-y-2">
                <Label htmlFor="verification-code" className="sr-only">
                  6-Digit Verification Code
                </Label>
                <Input
                  id="verification-code"
                  name="code"
                  placeholder="e.g. 123456"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono h-14"
                  required
                />
              </div>
              {verifyState.error && (
                <p className="text-sm text-destructive">{verifyState.error}</p>
              )}
              {verifyState.success && (
                <p className="text-sm text-success">Verification successful.</p>
              )}
              <SubmitButton className="w-full">Verify &amp; Complete Handover</SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>
    </AnimateIn>
  );
}
