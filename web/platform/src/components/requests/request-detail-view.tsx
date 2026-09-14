"use client";

import { Calendar, MapPin, Package, AlertTriangle } from "lucide-react";

import { type Listing, type ListingRequest } from "@rescufood/listings-sdk";
import {
  categoryLabels,
  isActiveRequest,
  quantity,
  pickupWindow,
  shortDate,
} from "@/lib/listing-labels";
import { ListingPhoto } from "@/components/listings/listing-photo";
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
import { PickupVerification } from "./pickup-verification";
import { RequestProgress } from "./request-progress";

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
    <div className="space-y-6">
      <AnimateIn>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Request Status</CardTitle>
            <CardDescription>
              Reserved{" "}
              <span className="font-medium text-foreground">{requested}</span>
              {fullLot ? ` of ${fullLot}` : ""} on{" "}
              <span className="font-medium text-foreground">
                {shortDate(request.requestedAt)}
              </span>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RequestProgress request={request} />

            {request.status === "cancelled" && request.cancellationReason && (
              <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                Reason: {request.cancellationReason}
              </div>
            )}

            {isActiveRequest(request.status) && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <CancelClaimButton requestId={request.id} size="sm">
                  Cancel claim
                </CancelClaimButton>
                <PickupVerification request={request} isDonor={isDonor} />
              </div>
            )}
          </CardContent>
        </Card>
      </AnimateIn>

      <AnimateIn>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Lot details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ListingPhoto
              listing={listing}
              overlay={
                <Badge
                  variant="secondary"
                  className="bg-background/90 backdrop-blur-sm"
                >
                  {listing.category ? categoryLabels[listing.category] : "Uncategorized"}
                </Badge>
              }
            />

            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {listing.description || "No description provided."}
            </p>

            <div className="grid gap-3">
              {listing.allergens.length > 0 && (
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-destructive" />
                  <div>
                    <span className="font-medium text-foreground">Allergens:</span>{" "}
                    {listing.allergens.join(", ")}
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
                    <span className="font-medium text-foreground">Pickup window:</span>{" "}
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
  );
}
