"use client";

import { useActionState, useId, useState } from "react";
import type { Listing } from "@rescufood/listings-sdk";

import {
  createRequestAction,
  type RequestFormState,
} from "@/app/requests/actions";
import { categoryLabels, quantity } from "@/lib/listing-labels";
import { Button } from "@rescufood/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rescufood/ui/components/dialog";
import { Input } from "@rescufood/ui/components/input";
import { Label } from "@rescufood/ui/components/label";

function ClaimForm({
  listing,
  idempotencyKey,
  onDone,
}: {
  listing: Listing;
  idempotencyKey: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<RequestFormState, FormData>(
    createRequestAction,
    {},
  );
  const fieldId = useId();
  const available = Number(listing.remainingQuantity);

  if (state.requestedId) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Your request is with the donor. You will see it under your requests
          while they decide.
        </p>
        <Button type="button" onClick={onDone} className="w-full">
          Done
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="listingId" value={listing.id} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <div className="flex flex-col gap-2">
        <Label htmlFor={fieldId}>How much can you collect?</Label>
        <Input
          id={fieldId}
          name="requestedQuantity"
          type="number"
          min="0.01"
          max={available}
          step="0.01"
          defaultValue={available}
          required
        />
        <p className="text-xs text-muted-foreground">
          In {listing.unit}. The donor confirms before pickup.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending..." : "Send request"}
        </Button>
      </div>
    </form>
  );
}

export function RequestDialog({ listing }: { listing: Listing }) {
  const [open, setOpen] = useState(false);
  // Minted per opening and used to key the form, so each attempt starts
  // clean and a retried submit replays the first claim.
  const [idempotencyKey, setIdempotencyKey] = useState("");

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setIdempotencyKey(crypto.randomUUID());
          setOpen(true);
        }}
      >
        Request
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Request this listing</DialogTitle>
            <DialogDescription>
              {/* Non-null: only available listings reach this dialog, and
                  the service guarantees these are filled in by then. */}
              {categoryLabels[listing.category!]} ·{" "}
              {quantity(listing.remainingQuantity!, listing.unit!)} left at{" "}
              {listing.pickupLocation}.
            </DialogDescription>
          </DialogHeader>

          {open && (
            <ClaimForm
              key={idempotencyKey}
              listing={listing}
              idempotencyKey={idempotencyKey}
              onDone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
