import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ListingRequest } from "@rescufood/listings-sdk";

import {
  quantity,
  requestStatusLabels,
  requestStatusVariant,
  shortDate,
} from "@/lib/listing-labels";
import { Badge } from "@rescufood/ui/components/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { CardContent } from "@rescufood/ui/components/card";

/** The five requests whose status moved most recently. */
export function RecentRequests({ requests }: { requests: ListingRequest[] }) {
  return (
    <Card data-animate="field">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          The latest movement on your pickup requests.
        </CardDescription>
        <CardAction>
          <Link
            href="/requests"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing has moved yet.
          </p>
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-2">
            {requests.map((request) => (
              <li
                key={request.id}
                className="col-span-4 grid grid-cols-subgrid border-b border-border last:border-0"
              >
                <Link
                  href={`/requests/${request.id}`}
                  className="group col-span-4 grid grid-cols-subgrid items-center py-2 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                >
                  <span className="text-sm font-medium group-hover:underline">
                    {quantity(request.requestedQuantity, "requested")}
                  </span>
                  <span className="text-right text-xs tabular-nums text-muted-foreground">
                    {shortDate(request.updatedAt)}
                  </span>
                  <Badge
                    variant={requestStatusVariant[request.status]}
                    className="w-full"
                  >
                    {requestStatusLabels[request.status]}
                  </Badge>
                  <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
