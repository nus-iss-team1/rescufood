import { AlertTriangle, Calendar, MapPin, Package } from "lucide-react";
import type { Listing } from "@rescufood/listings-sdk";

import {
  categoryLabels,
  listingStatusVariant,
  pickupWindow,
  quantity,
  shortDate,
} from "@/lib/listing-labels";
import { ListingPhoto } from "@/components/listings/listing-photo";
import { ClaimLotForm } from "@/components/browse/claim-lot-form";
import { Badge } from "@rescufood/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";

interface ListingDetailViewProps {
  listing: Listing;
}

export function ListingDetailView({ listing }: ListingDetailViewProps) {
  const lotQuantity =
    listing.quantity != null && listing.unit
      ? quantity(listing.quantity, listing.unit)
      : null;

  return (
    <div className="space-y-6">
      <Card data-animate="field">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl">Lot details</CardTitle>
            <Badge
              variant={listingStatusVariant[listing.status]}
              className="capitalize"
            >
              {listing.status}
            </Badge>
          </div>
          <CardDescription>
            {lotQuantity ? (
              <>
                <span className="font-medium text-foreground">
                  {lotQuantity}
                </span>{" "}
                available.
              </>
            ) : (
              "Quantity not specified."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ListingPhoto
            listing={listing}
            overlay={
              <Badge
                variant="secondary"
                className="bg-background/90 backdrop-blur-sm"
              >
                {listing.category
                  ? categoryLabels[listing.category]
                  : "Uncategorized"}
              </Badge>
            }
          />

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
                  <span className="font-medium text-foreground">
                    Pickup window:
                  </span>{" "}
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
                  <span className="font-medium text-foreground">Use by:</span>{" "}
                  {shortDate(listing.useBy)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div data-animate="field">
        <ClaimLotForm listing={listing} />
      </div>
    </div>
  );
}
