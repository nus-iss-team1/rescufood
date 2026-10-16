import Link from "next/link";
import { CalendarClock, PackageCheck } from "lucide-react";
import type { ListingRequest } from "@rescufood/listings-sdk";

import { CancelClaimButton } from "./cancel-claim-button";
import {
  categoryLabels,
  isActiveRequest,
  quantity,
  requestStatusLabels,
  requestStatusVariant,
  shortDate,
} from "@/lib/listing-labels";
import { Badge } from "@rescufood/ui/components/badge";
import { buttonVariants } from "@rescufood/ui/components/button";
import { cn } from "@/lib/utils";

export function RequestList({ requests }: { requests: ListingRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-3">
          <CalendarClock className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <h3 className="text-base font-medium text-foreground">No requests found</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          You haven&apos;t made any surplus food claims under this view. Explore available food listings to start rescuing.
        </p>
        <Link
          href="/browse"
          className={cn(buttonVariants({ size: "default" }), "mt-4")}
        >
          Browse surplus food
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {requests.map((request) => {
        const unit = request.listingUnit ?? "requested";
        return (
          <li
            key={request.id}
            data-animate="field"
            className={cn(
              "grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-start",
              // Settled requests stay readable but recede.
              !isActiveRequest(request.status) && "opacity-60",
            )}
          >
            <div className="grid gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/requests/${request.id}`}
                  prefetch={false}
                  className="font-medium hover:underline"
                >
                  {request.listingDescription ??
                    quantity(request.requestedQuantity, unit)}
                </Link>
                {request.listingCategory && (
                  <Badge variant="secondary">
                    {categoryLabels[request.listingCategory]}
                  </Badge>
                )}
                <Badge variant={requestStatusVariant[request.status]}>
                  {requestStatusLabels[request.status]}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {quantity(request.requestedQuantity, unit)}
              </p>

              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarClock className="size-4 shrink-0" aria-hidden />
                Asked {shortDate(request.requestedAt)}
              </p>

              {request.collectedAt && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <PackageCheck className="size-4 shrink-0" aria-hidden />
                  Collected {shortDate(request.collectedAt)}
                  {request.collectedQuantity
                    ? ` · ${quantity(request.collectedQuantity, request.listingUnit ?? "picked up")}`
                    : ""}
                </p>
              )}

              {request.status === "cancelled" && (
                <div className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground space-y-1">
                  {request.cancelledAt && (
                    <p className="font-medium text-foreground">
                      Cancelled on {shortDate(request.cancelledAt)} (SGT)
                    </p>
                  )}
                  {request.cancellationReason && (
                    <p>Reason: {request.cancellationReason}</p>
                  )}
                </div>
              )}

              {request.status === "no_show" && (
                <div className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground space-y-1">
                  {request.noShowAt && (
                    <p className="font-medium text-foreground">
                      Recorded on {shortDate(request.noShowAt)} (SGT)
                    </p>
                  )}
                  {request.noShowReason && (
                    <p>Reason: {request.noShowReason}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:justify-end">
              <Link
                href={`/requests/${request.id}`}
                prefetch={false}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                View Details
              </Link>
              {isActiveRequest(request.status) && (
                <CancelClaimButton requestId={request.id} size="sm" />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
