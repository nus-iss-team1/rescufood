import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, QrCode } from "lucide-react";
import type { Listing, ListingRequest } from "@rescufood/listings-sdk";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";

/** Whole hours until iso, floored; negative once it has passed. */
function hoursUntil(iso: string): number {
  return Math.floor((new Date(iso).getTime() - Date.now()) / 3_600_000);
}

function expiryLabel(iso: string): string {
  const hours = hoursUntil(iso);
  if (hours < 0) return "pickup window has closed";
  if (hours < 1) return "closes within the hour";
  if (hours === 1) return "closes in 1 hour";
  return `closes in ${hours} hours`;
}

function Row({
  icon: Icon,
  tone,
  href,
  title,
  detail,
}: {
  icon: typeof AlertTriangle;
  tone: "warn" | "info";
  href: string;
  title: string;
  detail: string;
}) {
  return (
    <li>
      <Link
        href={href}
        prefetch={false}
        className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
      >
        <Icon
          className={
            tone === "warn"
              ? "size-4 shrink-0 text-destructive"
              : "size-4 shrink-0 text-primary"
          }
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium group-hover:underline">
            {title}
          </span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    </li>
  );
}

/**
 * Listings whose pickup window is closing and claims waiting on a pickup
 * code, newest concern first. Renders a settled state when both are empty.
 */
export function NeedsAttention({
  expiring,
  awaitingPickup,
}: {
  expiring: Listing[];
  awaitingPickup: ListingRequest[];
}) {
  const total = expiring.length + awaitingPickup.length;

  return (
    <Card data-animate="field">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Needs attention
          {total > 0 && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive tabular-nums">
              {total}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-primary" aria-hidden />
            Nothing needs you right now.
          </p>
        ) : (
          <ul className="-mx-2 grid">
            {expiring.map((listing) => (
              <Row
                key={listing.id}
                icon={AlertTriangle}
                tone="warn"
                href={`/listings/${listing.id}`}
                title={listing.description ?? "Untitled listing"}
                detail={
                  listing.pickupWindowEnd
                    ? expiryLabel(listing.pickupWindowEnd)
                    : "no pickup window set"
                }
              />
            ))}
            {awaitingPickup.map((request) => (
              <Row
                key={request.id}
                icon={QrCode}
                tone="info"
                href={`/requests/${request.id}`}
                title={request.listingDescription ?? "Claimed listing"}
                detail="waiting on pickup verification"
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
