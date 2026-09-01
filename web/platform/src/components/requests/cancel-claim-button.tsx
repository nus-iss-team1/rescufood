"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { VariantProps } from "class-variance-authority";

import { cancelRequestAction } from "@/app/requests/actions";
import { toast } from "@rescufood/ui/components/sonner";
import { Button, buttonVariants } from "@rescufood/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rescufood/ui/components/dialog";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={pending}
      className="w-full sm:w-auto"
    >
      {pending ? "Cancelling..." : "Cancel claim"}
    </Button>
  );
}

/** Cancels a claim, behind a confirmation dialog. */
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
  // Reports from the action itself: revalidation unmounts this component, so
  // an effect would not survive to fire.
  const cancel = async (
    prev: { requestedId?: string; error?: string },
    formData: FormData,
  ) => {
    const result = await cancelRequestAction(prev, formData);
    if (result.requestedId) {
      toast.success("Claim cancelled", {
        description: "The lot is back on the browse list.",
      });
    } else if (result.error) {
      toast.error("Could not cancel", { description: result.error });
    }
    return result;
  };
  const [, action] = useActionState(cancel, {});

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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel this claim?</DialogTitle>
            <DialogDescription>
              The lot returns to the browse list for other rescue partners to
              claim. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep claim
            </Button>
            <form action={action}>
              <input type="hidden" name="requestId" value={requestId} />
              <ConfirmButton />
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
