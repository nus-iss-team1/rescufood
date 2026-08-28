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
          <ul className="grid gap-2">
            {requests.map((request) => (
              <li key={request.id} className="border-b border-border last:border-0">
                <Link 
                  href={`/requests/${request.id}`}
                  className="group flex flex-wrap items-center justify-between gap-2 py-2 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                >
                  <span className="text-sm font-medium group-hover:underline">
                    {quantity(request.requestedQuantity, "requested")}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {shortDate(request.updatedAt)}
                    </span>
                    <Badge variant={requestStatusVariant[request.status]}>
                      {requestStatusLabels[request.status]}
                    </Badge>
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
