"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import {
  reportNoShowAction,
  recordFailedCollectionAction,
} from "@/app/requests/actions";
import { Button } from "@rescufood/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rescufood/ui/components/dialog";
import { Label } from "@rescufood/ui/components/label";
import { Textarea } from "@rescufood/ui/components/textarea";
import { toast } from "@rescufood/ui/components/sonner";
import { cn } from "@/lib/utils";

const NO_SHOW_PRESETS = [
  "Partner did not arrive",
  "Unreachable by phone/contact",
  "Severe delay beyond window",
  "Other",
] as const;

const FAILED_COLLECTION_PRESETS = [
  "Partner unable to take full load",
  "Inadequate transport/cooling",
  "Food compromised before handover",
  "Other",
] as const;

export interface CollectionExceptionDialogProps {
  requestId: string;
  mode: "no_show" | "failed_collection";
  isOpen: boolean;
  onClose: () => void;
}

export function CollectionExceptionDialog({
  requestId,
  mode,
  isOpen,
  onClose,
}: CollectionExceptionDialogProps) {
  const router = useRouter();
  const presets =
    mode === "no_show" ? NO_SHOW_PRESETS : FAILED_COLLECTION_PRESETS;

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setSelectedPreset(null);
    setReason("");
    setConfirmStep(false);
    setError("");
    setSubmitting(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      reset();
    }
  };

  const handleSelectPreset = (preset: string) => {
    setSelectedPreset(preset);
    if (preset === "Other") {
      if ((presets as readonly string[]).includes(reason) && reason !== "Other") {
        setReason("");
      }
    } else {
      setReason(preset);
    }
    setError("");
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(
        mode === "no_show"
          ? "A reason is required to report a no-show."
          : "A reason is required to record a failed collection.",
      );
      return;
    }
    setError("");
    setConfirmStep(true);
  };

  const handleConfirmSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.set("requestId", requestId);
    formData.set("reason", trimmed);

    try {
      const action =
        mode === "no_show" ? reportNoShowAction : recordFailedCollectionAction;
      const result = await action({}, formData);

      if (result.error) {
        setError(result.error);
        toast.error("Action could not be completed", {
          description: result.error,
        });
        setSubmitting(false);
        return;
      }

      if (mode === "no_show") {
        toast.success("No-show reported successfully.");
      } else {
        if (result.listingRelisted === false) {
          const blocked = result.relistBlockedReason ?? "policy restriction";
          toast.success(
            `Failed collection recorded. Note: Lot could not be relisted (${blocked}).`,
          );
        } else {
          toast.success("Failed collection recorded. The lot is back on the browse list.");
        }
      }

      handleOpenChange(false);
      router.refresh();
    } catch {
      const msg = "Could not reach the server. Please try again.";
      setError(msg);
      toast.error("Failed to submit", { description: msg });
      setSubmitting(false);
    }
  };

  const isNoShow = mode === "no_show";
  const title = isNoShow
    ? "Report Partner No-Show"
    : "Record Failed Collection";
  const description = isNoShow
    ? "Record that the rescue partner did not arrive for the scheduled pickup. This marks the claim as no-show and reopens the food lot for another partner."
    : "Record that collection could not proceed at handover. This cancels the claim and reopens the food lot if eligible.";

  const trimmedReason = reason.trim();

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!confirmStep ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-destructive" />
                <span>{title}</span>
              </DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleProceedToConfirm} className="space-y-4">
              <div className="space-y-2">
                <Label>Select a reason tag</Label>
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label="Preset reason tags"
                >
                  {presets.map((preset) => {
                    const active = selectedPreset === preset;
                    return (
                      <Button
                        key={preset}
                        type="button"
                        size="xs"
                        variant={active ? "default" : "outline"}
                        aria-pressed={active}
                        onClick={() => handleSelectPreset(preset)}
                        className={cn("rounded-full")}
                      >
                        {preset}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`exception-reason-${requestId}`}>
                  Explanation
                </Label>
                <Textarea
                  id={`exception-reason-${requestId}`}
                  name="reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setError("");
                  }}
                  placeholder={
                    isNoShow
                      ? "Describe what happened (e.g. partner never arrived, unreachable by phone)..."
                      : "Explain why collection could not proceed..."
                  }
                  required
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={!trimmedReason}
                >
                  Review outcome
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-destructive" />
                <span>Confirm {isNoShow ? "No-Show" : "Failed Collection"}</span>
              </DialogTitle>
              <DialogDescription>
                Please review before confirming. This action is irreversible.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-2 text-sm">
                <p className="font-medium text-foreground">
                  {isNoShow
                    ? "Reporting partner no-show for this claim"
                    : "Recording failed collection for this claim"}
                </p>
                <div className="text-xs text-muted-foreground border-t border-border/60 pt-2 space-y-1">
                  <div>
                    <span className="font-medium text-foreground">Reason:</span>{" "}
                    {trimmedReason}
                  </div>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setConfirmStep(false);
                    setError("");
                  }}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                >
                  {submitting
                    ? isNoShow
                      ? "Reporting..."
                      : "Recording..."
                    : isNoShow
                      ? "Confirm No-Show"
                      : "Confirm Failed Collection"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
