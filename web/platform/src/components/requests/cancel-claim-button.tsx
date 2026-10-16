"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { VariantProps } from "class-variance-authority";

import {
  cancelRequestAction,
  type RequestFormState,
} from "@/app/requests/actions";
import { toast } from "@rescufood/ui/components/sonner";
import { Button, buttonVariants } from "@rescufood/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rescufood/ui/components/dialog";
import { Label } from "@rescufood/ui/components/label";
import { Textarea } from "@rescufood/ui/components/textarea";
import { cn } from "@/lib/utils";

const PRESET_REASONS = [
  "Vehicle breakdown",
  "Volunteer shortage",
  "Schedule conflict",
  "Other",
] as const;

type PresetReason = (typeof PRESET_REASONS)[number];

function ConfirmButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={pending || disabled}
      className="w-full sm:w-auto"
    >
      {pending ? "Cancelling..." : "Cancel claim"}
    </Button>
  );
}

/** Cancels a claim, behind a confirmation dialog requiring a reason. */
export function CancelClaimButton({
  requestId,
  size,
  className,
  children = "Cancel",
}: {
  requestId: string;
  size?: VariantProps<typeof buttonVariants>["size"];
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetReason | null>(
    null,
  );
  const [reason, setReason] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSelectedPreset(null);
      setReason("");
    }
  };

  const handleSelectPreset = (preset: PresetReason) => {
    setSelectedPreset(preset);
    if (preset === "Other") {
      if (
        PRESET_REASONS.includes(reason as PresetReason) &&
        reason !== "Other"
      ) {
        setReason("");
      }
    } else {
      setReason(preset);
    }
  };

  // Reports from the action itself: revalidation unmounts this component, so
  // an effect would not survive to fire.
  const cancel = async (
    prev: RequestFormState,
    formData: FormData,
  ): Promise<RequestFormState> => {
    const result = await cancelRequestAction(prev, formData);
    if (result.requestedId) {
      if (result.listingRelisted === false) {
        const blockedReason =
          result.relistBlockedReason ?? "policy restriction";
        toast.success(
          `Claim cancelled. Note: Lot could not be relisted (${blockedReason}).`,
        );
      } else {
        toast.success("Claim cancelled. The lot is back on the browse list.");
      }
      handleOpenChange(false);
    } else if (result.error) {
      toast.error("Could not cancel", { description: result.error });
    }
    return result;
  };
  const [state, action] = useActionState(cancel, {});

  const trimmedReason = reason.trim();

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this claim?</DialogTitle>
            <DialogDescription>
              Eligible lots return to the browse list for other rescue partners
              to claim. Late cancellations past the cutoff cannot be relisted.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <form action={action} className="space-y-4">
            <input type="hidden" name="requestId" value={requestId} />

            <div className="space-y-2">
              <Label>Select a reason</Label>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Preset cancellation reasons"
              >
                {PRESET_REASONS.map((preset) => {
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
              <Label htmlFor={`cancel-reason-${requestId}`}>
                Cancellation reason
              </Label>
              <Textarea
                id={`cancel-reason-${requestId}`}
                name="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why your organisation can no longer collect this lot..."
                required
              />
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Keep claim
              </Button>
              <ConfirmButton disabled={!trimmedReason} />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
