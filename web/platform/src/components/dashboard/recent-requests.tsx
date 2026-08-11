import Link from "next/link";
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
          <ul className="grid gap-2">
            {requests.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0 last:pb-0"
              >
                <span className="text-sm">
                  {quantity(request.requestedQuantity, "requested")}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {shortDate(request.updatedAt)}
                  </span>
                  <Badge variant={requestStatusVariant[request.status]}>
                    {requestStatusLabels[request.status]}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
