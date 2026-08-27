"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  PackageCheck,
} from "lucide-react";
import type { Listing } from "@rescufood/listings-sdk";

import {
  createRequestAction,
  type RequestFormState,
} from "@/app/requests/actions";
import { quantity } from "@/lib/listing-labels";
import { Button, buttonVariants } from "@rescufood/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { cn } from "@/lib/utils";

interface ClaimLotFormProps {
  listing: Listing;
}

export function ClaimLotForm({ listing }: ClaimLotFormProps) {
  const [state, action, pending] = useActionState<RequestFormState, FormData>(
    createRequestAction,
    {},
  );

  // Mint client UUID once on initial client render for idempotency readiness
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "",
  );

  const isAvailable = listing.status === "available";
  const lotQuantity =
    listing.remainingQuantity != null && listing.unit
      ? quantity(listing.remainingQuantity, listing.unit)
      : null;

  // Status gating messages for unavailable lots
  const getUnavailableNotice = () => {
    switch (listing.status) {
      case "reserved":
        return "This surplus food lot has already been reserved by a rescue partner.";
      case "cancelled":
        return "This listing has been cancelled by the donor and is no longer available.";
      case "expired":
        return "This listing has expired past its pickup window.";
      case "collected":
        return "This surplus food lot has already been collected.";
      case "draft":
        return "This listing is still in draft mode and is not yet available for claiming.";
      default:
        return "This food lot is currently not available for claiming.";
    }
  };

  if (state.requestedId) {
    return (
      <Card className="border-primary/20 bg-primary/5 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="size-5 shrink-0" />
            <CardTitle className="text-lg">Lot Claimed Successfully!</CardTitle>
          </div>
          <CardDescription className="text-foreground/80">
            Your request for the complete lot ({lotQuantity ?? "listed quantity"}
            ) has been submitted to the donor.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You can track this claim, generate pickup codes, and coordinate with
          the donor in your requests dashboard.
        </CardContent>
        <CardFooter className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Link
            href="/requests"
            className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-auto")}
          >
            View in Your Requests
          </Link>
          <Link
            href="/browse"
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            Find More Surplus Food
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (!isAvailable) {
    return (
      <Card className="border-border bg-muted/40 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="size-5 shrink-0" />
            <CardTitle className="text-base font-semibold">
              Lot Not Available
            </CardTitle>
          </div>
          <CardDescription className="text-sm">
            {getUnavailableNotice()}
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-2">
          <Button disabled className="w-full sm:w-auto">
            Claim Lot (Unavailable)
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-foreground">
          <PackageCheck className="size-5 text-primary" />
          <CardTitle className="text-lg">Ready to Claim</CardTitle>
        </div>
        <CardDescription>
          RescuFood claims apply to the complete listed lot (
          <span className="font-semibold text-foreground">
            {lotQuantity ?? "full quantity"}
          </span>
          ). By claiming, you commit to collecting this lot within the scheduled
          pickup window.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {state.error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="listingId" value={listing.id} />
          <input
            type="hidden"
            name="requestedQuantity"
            value={listing.remainingQuantity ?? "1"}
          />
          <input
            type="hidden"
            name="idempotencyKey"
            value={idempotencyKey || "claim-" + listing.id}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Claiming lot size: </span>
              <span className="font-semibold text-foreground">
                {lotQuantity ?? "Whole lot"}
              </span>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={pending}
              className="w-full font-medium sm:w-auto"
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Claiming Lot...
                </>
              ) : (
                "Claim Lot"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
