"use client";

import { useEffect, useRef } from "react";
import { Calendar, CheckCircle2, MapPin, Package, AlertTriangle } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { AnimateIn } from "@/components/animate-in";
import { PickupVerification } from "./pickup-verification";
import { toastPickupCompleted } from "./pickup-completed-toast";
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

  const prevStatusRef = useRef(request.status);

  useEffect(() => {
    if (prevStatusRef.current === "active" && request.status === "completed") {
      toastPickupCompleted(request.id);
    }
    prevStatusRef.current = request.status;
  }, [request.status, request.id]);

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

            {request.status === "no_show" && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-destructive shrink-0" />
                    <span className="font-semibold text-destructive">
                      Pickup Outcome: No-Show
                    </span>
                  </div>
                  {listing.status === "available" && (
                    <Badge variant="success">Lot reopened to Available</Badge>
                  )}
                  {listing.status === "expired" && (
                    <Badge variant="outline">Lot expired</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  The rescue partner did not arrive for the scheduled collection.
                </p>
                {request.noShowReason && (
                  <p className="text-foreground">
                    <span className="font-medium">Reason:</span> {request.noShowReason}
                  </p>
                )}
                {request.noShowAt && (
                  <p className="text-xs text-muted-foreground">
                    Recorded on {shortDate(request.noShowAt)} (SGT)
                  </p>
                )}
              </div>
            )}

            {request.status === "cancelled" && (
              <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {request.cancelledByOrgId === listing.donorOrgId
                      ? "Pickup Outcome: Failed Collection"
                      : "Claim cancelled"}
                  </span>
                  {listing.status === "available" && (
                    <Badge variant="success">Lot returned to Available</Badge>
                  )}
                  {listing.status === "expired" && (
                    <Badge variant="outline">Lot expired (not relisted)</Badge>
                  )}
                </div>
                {request.cancellationReason && (
                  <p>Reason: {request.cancellationReason}</p>
                )}
                {request.cancelledAt && (
                  <p className="text-xs text-muted-foreground">
                    Cancelled on {shortDate(request.cancelledAt)} (SGT)
                  </p>
                )}
              </div>
            )}

            {request.status === "completed" && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm flex items-start gap-3">
                <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Pickup completed</p>
                  <p className="text-muted-foreground">
                    Collected{" "}
                    <span className="font-medium text-foreground">
                      {quantity(
                        request.collectedQuantity || request.requestedQuantity,
                        listing.unit ?? ""
                      )}
                    </span>
                    {request.collectedAt && (
                      <>
                        {" "}on{" "}
                        <span className="font-medium text-foreground">
                          {shortDate(request.collectedAt)}
                        </span>
                      </>
                    )}
                    .
                  </p>
                </div>
              </div>
            )}

            <div
              className={cn(
                "flex flex-wrap items-center justify-end gap-2",
                !isActiveRequest(request.status) && "hidden"
              )}
            >
              {!isDonor && isActiveRequest(request.status) && (
                <CancelClaimButton requestId={request.id} size="sm">
                  Cancel claim
                </CancelClaimButton>
              )}
              <PickupVerification
                request={request}
                isDonor={isDonor}
                listing={listing}
              />
            </div>
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
