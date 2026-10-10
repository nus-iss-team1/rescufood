import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { Listing, ListingRequest } from "@rescufood/listings-sdk";

import {
  listingStatusVariant,
  longDateTime,
  requestStatusLabels,
  requestStatusVariant,
} from "@/lib/listing-labels";
import { Badge } from "@rescufood/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rescufood/ui/components/table";

/** Whole hours until iso, floored; negative once it has passed. */
function hoursUntil(iso: string): number {
  return Math.floor((new Date(iso).getTime() - Date.now()) / 3_600_000);
}

/** Rows shown at once; the rest wait until these are dealt with. */
const MAX_ROWS = 5;

interface AttentionRow {
  id: string;
  href: string;
  item: string;
  /** The record's own status, not a derived label. */
  status: string;
  tone: "info" | "success" | "destructive" | "outline";
  when: string;
  /** Hours until the deadline; claims have none, so they sort last. */
  urgency: number;
}

function toRows(
  expiring: Listing[],
  awaitingPickup: ListingRequest[],
): AttentionRow[] {
  const closing: AttentionRow[] = expiring.map((listing) => ({
    id: `listing-${listing.id}`,
    href: `/listings/${listing.id}`,
    item: listing.description ?? "—",
    status: listing.status,
    tone: listingStatusVariant[listing.status],
    when: listing.pickupWindowEnd ? longDateTime(listing.pickupWindowEnd) : "—",
    urgency: listing.pickupWindowEnd
      ? hoursUntil(listing.pickupWindowEnd)
      : Number.MAX_SAFE_INTEGER,
  }));

  const verify: AttentionRow[] = awaitingPickup.map((request) => ({
    id: `request-${request.id}`,
    href: `/requests/${request.id}`,
    item: request.listingDescription ?? "—",
    status: requestStatusLabels[request.status],
    tone: requestStatusVariant[request.status],
    when: longDateTime(request.requestedAt),
    urgency: Number.MAX_SAFE_INTEGER,
  }));

  return [...closing, ...verify].sort((a, b) => a.urgency - b.urgency);
}

/**
 * Listings whose pickup window is closing and claims waiting on a pickup
 * code, soonest deadline first. Renders a settled state when both are empty.
 */
export function NeedsAttention({
  expiring,
  awaitingPickup,
}: {
  expiring: Listing[];
  awaitingPickup: ListingRequest[];
}) {
  const rows = toRows(expiring, awaitingPickup);
  const shown = rows.slice(0, MAX_ROWS);

  return (
    <Card data-animate="field" className="h-fit">
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
        <CardDescription>
          Closing soon, or waiting on a code.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="flex items-center gap-2 px-(--card-spacing) text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-primary" aria-hidden />
            Nothing needs you right now.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {/* w-full makes Item greedy; the others size to content. */}
                <TableHead className="w-full pl-(--card-spacing)">Item</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-(--card-spacing) text-right">
                  When
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((row) => (
                <TableRow key={row.id} className="last:border-0">
                  {/* max-w-0 lets truncate work inside an auto-width table. */}
                  <TableCell className="max-w-0 truncate pl-(--card-spacing) font-medium">
                    <Link
                      href={row.href}
                      prefetch={false}
                      className="underline-offset-4 hover:underline"
                    >
                      {row.item}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.tone} className="capitalize">
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-(--card-spacing) text-right text-muted-foreground tabular-nums">
                    {row.when}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {rows.length > shown.length && (
          <p className="px-(--card-spacing) pt-3 text-xs text-muted-foreground">
            {rows.length - shown.length} more not shown.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
