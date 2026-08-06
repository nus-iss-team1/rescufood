import { CalendarClock, TriangleAlert } from "lucide-react";

import type { Listing, ListingStatus } from "@/lib/mock-listings";
import { Badge } from "@rescufood/ui/components/badge";

const statusVariant: Record<
  ListingStatus,
  "success" | "info" | "outline" | "destructive"
> = {
  available: "success",
  reserved: "info",
  collected: "outline",
  expired: "destructive",
  cancelled: "outline",
};

const time = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function pickupWindow(listing: Listing) {
  const from = new Date(listing.pickupFrom);
  const to = new Date(listing.pickupTo);
  const sameDay = from.toDateString() === to.toDateString();
  return sameDay
    ? `${time.format(from)} – ${new Intl.DateTimeFormat("en-SG", {
        hour: "numeric",
        minute: "2-digit",
      }).format(to)}`
    : `${time.format(from)} – ${time.format(to)}`;
}

export function ListingList({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {listings.map((listing) => (
        <li
          key={listing.id}
          data-animate="field"
          className="grid min-h-32 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-start"
        >
          <div className="grid gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{listing.title}</span>
              <Badge variant="secondary">{listing.category}</Badge>
              <span className="text-sm text-muted-foreground">
                {listing.quantity}
              </span>
            </div>

            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="size-4 shrink-0" aria-hidden />
              Pickup {pickupWindow(listing)}
            </p>

            {listing.allergens.length > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
                {listing.allergens.join(", ")}
              </p>
            )}

            <p className="text-xs text-muted-foreground">{listing.handling}</p>
          </div>

          <Badge
            variant={statusVariant[listing.status]}
            className="capitalize sm:justify-self-end"
          >
            {listing.status}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
