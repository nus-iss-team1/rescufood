import Link from "next/link";
import { CalendarClock, PackageCheck } from "lucide-react";
import type { ListingRequest } from "@rescufood/listings-sdk";

import { cancelRequestAction } from "@/app/requests/actions";
import {
  isActiveRequest,
  quantity,
  requestStatusLabels,
  requestStatusVariant,
  shortDate,
} from "@/lib/listing-labels";
import { Badge } from "@rescufood/ui/components/badge";
import { Button, buttonVariants } from "@rescufood/ui/components/button";
import { cn } from "@/lib/utils";

export function RequestList({ requests }: { requests: ListingRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">
          You haven&apos;t requested anything yet.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {requests.map((request) => (
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
              <Link href={`/requests/${request.id}`} className="font-medium hover:underline">
                {quantity(request.requestedQuantity, "requested")}
              </Link>
              <Badge variant={requestStatusVariant[request.status]}>
                {requestStatusLabels[request.status]}
              </Badge>
            </div>

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
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            <Link
              href={`/requests/${request.id}`}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              View Details
            </Link>
            {isActiveRequest(request.status) && (
              <form action={cancelRequestAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <Button type="submit" variant="outline" size="sm">
                  Cancel
                </Button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
