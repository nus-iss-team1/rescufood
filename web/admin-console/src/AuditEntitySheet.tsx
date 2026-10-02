import { useEffect, useState } from "react";
import type { AuditEvent } from "@rescufood/listings-sdk";

import { Badge } from "@rescufood/ui/components/badge";
import { Separator } from "@rescufood/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@rescufood/ui/components/sheet";
import { Skeleton } from "@rescufood/ui/components/skeleton";

import { listingsClient, ListingsApiError } from "./api";
import { actionLabel, actionTone, listingIdOf, shortId } from "./lib/audit";
import { absolute, timeAgo } from "./lib/time";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-all text-sm">{value || "—"}</dd>
    </div>
  );
}

/**
 * One entity's full history, oldest first - the order the service returns it
 * in, which is the order a transaction reads in. Opened from a feed row.
 */
export function AuditEntitySheet({
  event,
  names,
  onClose,
}: {
  event: AuditEvent | null;
  names: Map<string, string>;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // An event with no entity - a login attempt on an unknown account - has
    // no per-entity history to fetch; the selected event is all there is.
    if (!event || !event.entityId) {
      setHistory(event ? [] : null);
      setError("");
      return;
    }
    let live = true;
    setHistory(null);
    setError("");
    listingsClient
      .getEntityAuditHistory(event.entityType, event.entityId, { limit: 200 })
      .then((page) => {
        if (live) setHistory(page.items);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setHistory([]);
        setError(
          err instanceof ListingsApiError
            ? err.message
            : "failed to load this entity's history",
        );
      });
    return () => {
      live = false;
    };
  }, [event]);

  const actor = (item: AuditEvent) =>
    item.userId !== null
      ? (names.get(item.userId) ?? shortId(item.userId))
      : (item.subject ?? "System");

  return (
    <Sheet open={event !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {event && (
          <>
            <SheetHeader>
              <SheetTitle className="capitalize">
                {event.entityType} history
              </SheetTitle>
              <SheetDescription className="font-mono text-xs">
                {event.entityId ?? event.subject ?? "unknown"}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 px-4 pb-6">
              <dl className="grid gap-3 rounded-lg border bg-muted/40 p-3">
                <Row label="Selected event" value={actionLabel(event.action)} />
                <Row label="Actor" value={actor(event)} />
                <Row label="When" value={absolute(event.createdAt)} />
                <Row label="Reason" value={event.reason} />
                {listingIdOf(event) && (
                  <Row
                    label="Belongs to listing"
                    value={listingIdOf(event) ?? ""}
                  />
                )}
                <div className="grid gap-0.5">
                  <dt className="text-xs text-muted-foreground">Metadata</dt>
                  <dd>
                    <pre className="overflow-x-auto rounded bg-background p-2 text-xs">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  </dd>
                </div>
              </dl>

              <Separator />

              <div className="grid gap-1">
                <h3 className="text-sm font-medium">Full history</h3>
                <p className="text-xs text-muted-foreground">
                  Oldest first. These events are append-only, so they do not
                  change when the {event.entityType} does.
                </p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              {history === null && (
                <div className="grid gap-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}

              {history && history.length > 0 && (
                <ol className="grid gap-3">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className={
                        item.id === event.id
                          ? "grid gap-1 rounded-lg border border-primary/40 bg-primary/5 p-3"
                          : "grid gap-1 rounded-lg border p-3"
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant={actionTone(item.action)}>
                          {actionLabel(item.action)}
                        </Badge>
                        <span
                          className="shrink-0 text-xs text-muted-foreground"
                          title={absolute(item.createdAt)}
                        >
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {actor(item)}
                      </p>
                      {item.reason && <p className="text-sm">{item.reason}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
