"use client";

import Image from "next/image";
import { Calendar, MapPin, Package, AlertTriangle } from "lucide-react";

import { type Listing, type ListingRequest } from "@rescufood/listings-sdk";
import {
  categoryLabels,
  requestStatusLabels,
  requestStatusVariant,
  isActiveRequest,
  quantity,
  pickupWindow,
  shortDate,
} from "@/lib/listing-labels";
import { CancelClaimButton } from "./cancel-claim-button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { Badge } from "@rescufood/ui/components/badge";
import { AnimateIn } from "@/components/animate-in";
import { PickupCredentialCard } from "./pickup-credential-card";

export function RequestDetailView({
  request,
  listing,
  isDonor,
}: {
  request: ListingRequest;
  listing: Listing;
  isDonor: boolean;
}) {
  const fullLot =
    listing.quantity && listing.unit
      ? quantity(listing.quantity, listing.unit)
      : null;
  const requested = quantity(request.requestedQuantity, listing.unit ?? "").trim();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <AnimateIn>
          <Card>
            <CardHeader>
              <CardTitle>Surplus Food Lot Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {listing.images.length > 0 && (
                <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
                  <Image
                    src={listing.images[0].url}
                    alt="Listing image"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {listing.category ? categoryLabels[listing.category] : "Uncategorized"}
                    </Badge>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {listing.description || "No description provided."}
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-xs text-muted-foreground">Full lot</div>
                    <div className="text-sm font-medium">
                      {fullLot ?? "Unknown quantity"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 pt-4 border-t">
                {listing.allergens.length > 0 && (
                  <div className="flex gap-2 text-sm">
                    <AlertTriangle className="size-4 shrink-0 text-destructive mt-0.5" />
                    <div>
                      <span className="font-semibold text-destructive">Allergens:</span>{" "}
                      <span className="text-foreground">{listing.allergens.join(", ")}</span>
                    </div>
                  </div>
                )}
                
                {listing.handlingInstructions && (
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <Package className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-foreground">Handling:</span>{" "}
                      {listing.handlingInstructions}
                    </div>
                  </div>
                )}
                
                {listing.pickupWindowStart && listing.pickupWindowEnd && (
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <Calendar className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-foreground">Pickup Window:</span>{" "}
                      {pickupWindow(listing.pickupWindowStart, listing.pickupWindowEnd)}
                    </div>
                  </div>
                )}
                
                {listing.pickupLocation && (
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-foreground">Location:</span>{" "}
                      {listing.pickupLocation}
                    </div>
                  </div>
                )}
                
                {listing.useBy && (
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5 text-warning" />
                    <div>
                      <span className="font-medium text-foreground">Use By:</span>{" "}
                      {shortDate(listing.useBy)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </AnimateIn>
      </div>

      <div className="space-y-6">
        <AnimateIn>
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-xl">Request Status</CardTitle>
                <Badge variant={requestStatusVariant[request.status]}>
                  {requestStatusLabels[request.status]}
                </Badge>
              </div>
              <CardDescription>
                Claimed{" "}
                <span className="font-medium text-foreground">{requested}</span>
                {fullLot ? ` of ${fullLot}` : ""} on{" "}
                <span className="font-medium text-foreground">
                  {shortDate(request.requestedAt)}
                </span>
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.status === "active" && (
                <div className="rounded-md bg-success/15 p-4 text-sm text-success-foreground">
                  <p className="font-medium">This lot is reserved for your organisation.</p>
                  <p className="mt-1">
                    {isDonor
                      ? "A rescue partner has claimed this lot. They will arrive to collect it within the pickup window."
                      : "You have claimed this lot. Please collect it within the pickup window."}
                  </p>
                </div>
              )}
              {request.status === "cancelled" && (
                <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                  <p className="font-medium">This request was cancelled.</p>
                  {request.cancellationReason && (
                    <p className="mt-1">Reason: {request.cancellationReason}</p>
                  )}
                </div>
              )}
              {isActiveRequest(request.status) && (
                <CancelClaimButton requestId={request.id} className="w-full">
                  Cancel Claim
                </CancelClaimButton>
              )}
            </CardContent>
          </Card>
        </AnimateIn>

        {(request.status === "active" || request.status === "cancelled" || request.status === "completed") && (
          <PickupCredentialCard request={request} isDonor={isDonor} />
        )}
      </div>
    </div>
  );
}
