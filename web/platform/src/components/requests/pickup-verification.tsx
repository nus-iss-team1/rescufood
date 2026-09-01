"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { useFormStatus } from "react-dom";
import { Clock } from "lucide-react";

import type { ListingRequest, PickupCode } from "@rescufood/listings-sdk";
import { getPickupCredentialAction, verifyPickupCodeAction } from "@/app/requests/actions";
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto min-w-24">
      {pending ? "Confirming..." : "Confirm pickup"}
    </Button>
  );
}

export function PickupVerification({
  request,
  isDonor,
}: {
  request: ListingRequest;
  isDonor: boolean;
}) {
  const [codeOpen, setCodeOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [credential, setCredential] = useState<PickupCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reports from the action itself: revalidation unmounts this component, so
  // an effect would not survive to fire.
  const verify = async (
    prev: { success?: boolean; error?: string },
    formData: FormData,
  ) => {
    const result = await verifyPickupCodeAction(prev, formData);
    if (result.success) {
      toast.success("Pickup confirmed", {
        description: "The lot is marked as collected.",
      });
    } else if (result.error) {
      toast.error("Pickup not confirmed", { description: result.error });
    }
    return result;
  };
  const [verifyState, verifyAction] = useActionState(verify, {});

  const router = useRouter();
  const waiting =
    isDonor && request.status === "active" && !request.codeGeneratedBy;

  // Polls for the code the partner generates in their own session.
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(id);
  }, [waiting, router]);

  const showCode = () => {
    setCodeOpen(true);
    if (credential || loading) return;
    setLoading(true);
    setError("");
    getPickupCredentialAction(request.id)
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
        <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirm pickup</DialogTitle>
              <DialogDescription>
                Enter the rescue partner&apos;s code.
              </DialogDescription>
            </DialogHeader>
            <form action={verifyAction} className="space-y-4">
              <input type="hidden" name="requestId" value={request.id} />
              <OtpInput name="code" />
              {verifyState.error && (
                <p className="text-sm text-destructive">{verifyState.error}</p>
              )}
              {verifyState.success && (
                <p className="text-sm text-success">Verification successful.</p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVerifyOpen(false)}
                >
                  Cancel
                </Button>
                <SubmitButton />
              </div>
            </form>
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
            {loading ? (
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
              </div>
            ) : (
              <div className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <Button onClick={showCode} className="w-full">
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
