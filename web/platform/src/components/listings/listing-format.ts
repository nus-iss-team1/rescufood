import type { Listing, ListingStatus } from "@/lib/mock-listings";

export const statusVariant: Record<
  ListingStatus,
  "success" | "info" | "outline" | "destructive"
> = {
  available: "success",
  reserved: "info",
  collected: "outline",
  expired: "destructive",
  cancelled: "outline",
};

const dateTime = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const timeOnly = new Intl.DateTimeFormat("en-SG", {
  hour: "numeric",
  minute: "2-digit",
});

/** Drops the repeated date when the window opens and closes the same day. */
export function pickupWindow(listing: Listing) {
  const from = new Date(listing.pickupFrom);
  const to = new Date(listing.pickupTo);
  return from.toDateString() === to.toDateString()
    ? `${dateTime.format(from)} – ${timeOnly.format(to)}`
    : `${dateTime.format(from)} – ${dateTime.format(to)}`;
}
