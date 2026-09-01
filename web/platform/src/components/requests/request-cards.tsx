import Link from "next/link";
import { CalendarClock, PackageCheck } from "lucide-react";
import type { Listing, ListingRequest } from "@rescufood/listings-sdk";

import { CancelClaimButton } from "./cancel-claim-button";
import {
  isActiveRequest,
  quantity,
  requestStatusLabels,
  requestStatusVariant,
  shortDate,
} from "@/lib/listing-labels";
import { ListingPhoto } from "@/components/listings/listing-photo";
import { categoryLabels } from "@/lib/listing-labels";
import { Badge } from "@rescufood/ui/components/badge";
import { buttonVariants } from "@rescufood/ui/components/button";
import { cn } from "@/lib/utils";

export function RequestCards({
  requests,
  listings,
}: {
  requests: ListingRequest[];
  /** The listings these requests point at, keyed by id. */
  listings?: Map<string, Listing>;
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {requests.map((request) => (
        <li
          key={request.id}
          data-animate="field"
          className={cn(
            "flex flex-col gap-3 rounded-lg border border-border bg-card p-4",
            "transition-[transform,box-shadow] duration-200 ease-out",
            "motion-safe:hover:-translate-y-0.5 hover:shadow-md",
            // Settled requests stay readable but recede.
            !isActiveRequest(request.status) && "opacity-60",
          )}
        >
          <Link href={`/requests/${request.id}`} className="block group">
            <ListingPhoto
              listing={listings?.get(request.listingId)}
              overlay={
                listings?.get(request.listingId) && (
                  <Badge
                    variant="secondary"
                    className="bg-background/90 backdrop-blur-sm"
                  >
                    {/* Non-null: a request can only exist against a listing
                        that was available (and so complete) when it was made. */}
                    {categoryLabels[listings.get(request.listingId)!.category!]}
                  </Badge>
                )
              }
            />
          </Link>

          <div className="flex items-start justify-between gap-2">
            <Link href={`/requests/${request.id}`} className="font-medium hover:underline">
              {listings?.get(request.listingId)?.description ??
                quantity(request.requestedQuantity, "requested")}
            </Link>
            <Badge
              variant={requestStatusVariant[request.status]}
              className="shrink-0"
            >
              {requestStatusLabels[request.status]}
            </Badge>
          </div>

          <span className="text-sm text-muted-foreground">
            {quantity(request.requestedQuantity, "requested")}
          </span>

          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="size-4 shrink-0" aria-hidden />
            Asked {shortDate(request.requestedAt)}
          </p>

          {request.collectedAt && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <PackageCheck className="size-4 shrink-0" aria-hidden />
              Collected {shortDate(request.collectedAt)}
              {request.collectedQuantity
                ? ` · ${quantity(request.collectedQuantity, "picked up")}`
                : ""}
            </p>
          )}

          {request.cancellationReason && (
            <p className="text-xs text-muted-foreground">
              Reason: {request.cancellationReason}
            </p>
          )}
          {request.noShowReason && (
            <p className="text-xs text-muted-foreground">
              {request.noShowReason}
            </p>
          )}

          <div className="mt-auto flex flex-wrap gap-2 items-center">
            <Link
              href={`/requests/${request.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              View Details
            </Link>
            {isActiveRequest(request.status) && (
              <CancelClaimButton requestId={request.id} size="sm" />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
