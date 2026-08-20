import { CalendarClock, MapPin, TriangleAlert } from "lucide-react";
import type { Listing } from "@rescufood/listings-sdk";

import {
  categoryLabels,
  listingStatusVariant,
  pickupWindow,
  quantity,
} from "@/lib/listing-labels";
import { Badge } from "@rescufood/ui/components/badge";
import { cn } from "@/lib/utils";

export function ListingList({
  listings,
  action,
  showStatus = true,
  empty = "Nothing here yet.",
}: {
  listings: Listing[];
  /** Rendered beside each row, e.g. a request button. */
  action?: (listing: Listing) => React.ReactNode;
  showStatus?: boolean;
  empty?: string;
}) {
  if (listings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {listings.map((listing) => (
        <li
          key={listing.id}
          data-animate="field"
          className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-start"
        >
          <div className="grid gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {listing.description || "Untitled draft"}
              </span>
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

            {/* Always rendered so rows with and without allergens line up. */}
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
          </div>

          <div className="flex items-center gap-2 sm:flex-col sm:items-end">
            {showStatus && (
              <Badge
                variant={listingStatusVariant[listing.status]}
                className="capitalize"
              >
                {listing.status}
              </Badge>
            )}
            {action?.(listing)}
          </div>
        </li>
      ))}
    </ul>
  );
}
