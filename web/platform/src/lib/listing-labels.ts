import type {
  ListingCategory,
  ListingStatus,
  RequestStatus,
} from "@rescufood/listings-sdk";

export const categoryLabels: Record<ListingCategory, string> = {
  produce: "Fresh produce",
  bakery: "Bakery",
  dairy: "Dairy",
  meat_seafood: "Meat & seafood",
  prepared_food: "Prepared food",
  packaged_dry_goods: "Packaged & dry goods",
  beverages: "Beverages",
  other: "Other",
};

export const listingStatusVariant: Record<
  ListingStatus,
  "info" | "success" | "destructive" | "outline"
> = {
  draft: "outline",
  available: "success",
  reserved: "info",
  collected: "outline",
  expired: "destructive",
  cancelled: "outline",
};

/** The service's own status names; only the underscore is formatted away. */
export const requestStatusLabels: Record<RequestStatus, string> = {
  active: "Active",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No show",
  expired: "Expired",
};

export const requestStatusVariant: Record<
  RequestStatus,
  "info" | "success" | "destructive" | "outline"
> = {
  active: "success",
  cancelled: "outline",
  completed: "success",
  no_show: "destructive",
  expired: "outline",
};

/** Still in play; every other status is terminal. */
export function isActiveRequest(status: RequestStatus) {
  return status === "active";
}

/** Trims the trailing zeros the service's decimal strings carry. */
export function quantity(amount: string, unit: string) {
  const trimmed = amount.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  return `${trimmed} ${unit}`;
}

const TIME_ZONE = "Asia/Singapore";

const dateTime = new Intl.DateTimeFormat("en-SG", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const timeOnly = new Intl.DateTimeFormat("en-SG", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

const dateTimeWithYear = new Intl.DateTimeFormat("en-SG", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Calendar day in TIME_ZONE, for comparing two instants by date. */
const dayKey = new Intl.DateTimeFormat("en-SG", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Drops the repeated date when the window opens and closes the same day. */
export function pickupWindow(startIso: string, endIso: string) {
  const from = new Date(startIso);
  const to = new Date(endIso);
  return dayKey.format(from) === dayKey.format(to)
    ? `${dateTime.format(from)} – ${timeOnly.format(to)}`
    : `${dateTime.format(from)} – ${dateTime.format(to)}`;
}

export function shortDate(iso: string) {
  return dateTime.format(new Date(iso));
}

/** Date and time including the year. */
export function longDateTime(iso: string) {
  return dateTimeWithYear.format(new Date(iso));
}
