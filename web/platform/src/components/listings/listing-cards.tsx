import { CalendarClock, ImageOff, TriangleAlert } from "lucide-react";

import type { Listing } from "@/lib/mock-listings";
import { pickupWindow, statusVariant } from "./listing-format";
import { Badge } from "@rescufood/ui/components/badge";
import { cn } from "@/lib/utils";

/** Stands in until listings carry images. */
function Placeholder() {
  return (
    <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
      <ImageOff className="size-6 text-muted-foreground" aria-hidden />
      <span className="sr-only">No photo yet</span>
    </div>
  );
}

export function ListingCards({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
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
          <Placeholder />

          <div className="flex items-start justify-between gap-2">
            <span className="font-medium">{listing.title}</span>
            <Badge
              variant={statusVariant[listing.status]}
              className="shrink-0 capitalize"
            >
              {listing.status}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{listing.category}</Badge>
            <span className="text-sm text-muted-foreground">
              {listing.quantity}
            </span>
          </div>

          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="size-4 shrink-0" aria-hidden />
            Pickup {pickupWindow(listing)}
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

          <p className="mt-auto text-xs text-muted-foreground">
            {listing.handling}
          </p>
        </li>
      ))}
    </ul>
  );
}
