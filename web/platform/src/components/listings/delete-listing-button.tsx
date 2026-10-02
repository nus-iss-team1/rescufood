"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { VariantProps } from "class-variance-authority";

import {
  deleteListingAction,
  type DeleteListingState,
} from "@/app/listings/actions";
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
      {pending ? "Deleting..." : "Delete listing"}
    </Button>
  );
}

/** Deletes a listing, behind a confirmation dialog. */
export function DeleteListingButton({
  listingId,
  listingDescription,
  size = "sm",
  variant = "destructive",
  className,
  redirectTo,
  children,
}: {
  listingId: string;
  listingDescription?: string | null;
  size?: VariantProps<typeof buttonVariants>["size"];
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
  redirectTo?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const remove = async (
    prev: DeleteListingState,
    formData: FormData,
  ) => {
    const result = await deleteListingAction(prev, formData);
    if (result.deletedId) {
      setOpen(false);
      toast.success("Listing deleted", {
        description: "The listing has been removed.",
      });
      if (redirectTo) {
        router.push(redirectTo);
      }
    } else if (result.error) {
      toast.error("Could not delete listing", { description: result.error });
    }
    return result;
  };

  const [, action] = useActionState(remove, {});

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children ?? (
          <>
            <Trash2 className="size-3.5" />
            Delete
          </>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this listing?</DialogTitle>
            <DialogDescription>
              {listingDescription
                ? `Are you sure you want to delete "${listingDescription}"? This action cannot be undone.`
                : "This listing will be permanently removed. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <form action={action}>
              <input type="hidden" name="listingId" value={listingId} />
              <ConfirmButton />
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
