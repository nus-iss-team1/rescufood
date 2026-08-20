import { CalendarClock, MapPin, TriangleAlert } from "lucide-react";
import type { Listing } from "@rescufood/listings-sdk";

import {
  categoryLabels,
  listingStatusVariant,
  pickupWindow,
  quantity,
} from "@/lib/listing-labels";
import { ListingPhoto } from "@/components/listings/listing-photo";
import { Badge } from "@rescufood/ui/components/badge";
import { cn } from "@/lib/utils";

export function ListingCards({
  listings,
  action,
  showStatus = true,
  empty = "Nothing here yet.",
}: {
  listings: Listing[];
  /** Rendered at the foot of each card, e.g. a request button. */
  action?: (listing: Listing) => React.ReactNode;
  showStatus?: boolean;
  empty?: React.ReactNode;
}) {
  if (listings.length === 0) {
    if (typeof empty !== "string") {
      return <>{empty}</>;
    }
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <li
          key={listing.id}
          data-animate="field"
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
        >
          <ListingPhoto listing={listing} />

          <div className="flex items-start justify-between gap-2">
            <span className="font-medium">
              {listing.description || "Untitled draft"}
            </span>
            {showStatus && (
              <Badge
                variant={listingStatusVariant[listing.status]}
                className="shrink-0 capitalize"
              >
                {listing.status}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {listing.category
                ? categoryLabels[listing.category]
                : "No category yet"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {listing.remainingQuantity != null && listing.unit
                ? quantity(listing.remainingQuantity, listing.unit)
                : "Quantity not set"}
            </span>
          </div>

          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="size-4 shrink-0" aria-hidden />
            Pickup{" "}
            {listing.pickupWindowStart && listing.pickupWindowEnd
              ? pickupWindow(listing.pickupWindowStart, listing.pickupWindowEnd)
              : "time not set"}
          </p>

          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {listing.pickupLocation || "Pickup location not set"}
          </p>

          {/* Always rendered so cards with and without allergens line up. */}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TriangleAlert
              className={cn(
                "size-3.5 shrink-0",
                listing.allergens.length === 0 && "opacity-40",
              )}
              aria-hidden
            />
            {listing.allergens.length > 0
              ? listing.allergens.join(", ")
              : "No allergens declared"}
          </p>

          {listing.handlingInstructions && (
            <p className="text-xs text-muted-foreground">
              {listing.handlingInstructions}
            </p>
          )}

          {action && <div className="mt-auto pt-1">{action(listing)}</div>}
        </li>
      ))}
    </ul>
  );
}
