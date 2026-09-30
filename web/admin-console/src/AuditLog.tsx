import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AuditEntityType,
  AuditEvent,
  AuditEventQuery,
} from "@rescufood/listings-sdk";

import { Badge } from "@rescufood/ui/components/badge";
import { Button } from "@rescufood/ui/components/button";
import { Input } from "@rescufood/ui/components/input";
import { Label } from "@rescufood/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rescufood/ui/components/select";
import { Skeleton } from "@rescufood/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rescufood/ui/components/table";

import { listingsClient, ListingsApiError } from "./api";
import { AuditEntitySheet } from "./AuditEntitySheet";
import { actionLabel, actionTone, shortId } from "./lib/audit";
import { resolveActorNames } from "./lib/actor-names";
import { absolute, endOfDayIso, startOfDayIso, timeAgo } from "./lib/time";

const PAGE_SIZE = 50;
const ALL = "all";

interface Filters {
  entityType: AuditEntityType | typeof ALL;
  userId: string;
  from: string;
  to: string;
}

const emptyFilters: Filters = {
  entityType: ALL,
  userId: ALL,
  from: "",
  to: "",
};

function isFiltered(filters: Filters): boolean {
  return (
    filters.entityType !== ALL ||
    filters.userId !== ALL ||
    filters.from !== "" ||
    filters.to !== ""
  );
}

function toQuery(filters: Filters, offset: number): AuditEventQuery {
  return {
    entityType: filters.entityType === ALL ? undefined : filters.entityType,
    userId: filters.userId === ALL ? undefined : filters.userId,
    createdAtFrom: filters.from ? startOfDayIso(filters.from) : undefined,
    createdAtTo: filters.to ? endOfDayIso(filters.to) : undefined,
    limit: PAGE_SIZE,
    offset,
  };
}

export function AuditLog() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [offset, setOffset] = useState(0);
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [detail, setDetail] = useState<AuditEvent | null>(null);

  // Actors accumulate across pages: the api has no facet endpoint, so the
  // dropdown can only offer the actors seen so far.
  const [actorIds, setActorIds] = useState<string[]>([]);

  const load = useCallback(async (next: Filters, nextOffset: number) => {
    setEvents(null);
    setError("");
    try {
      const page = await listingsClient.listAuditEvents(
        toQuery(next, nextOffset),
      );
      setEvents(page.items);
      setTotal(page.total);
      setActorIds((current) => {
        const merged = new Set(current);
        for (const event of page.items) {
          if (event.userId) merged.add(event.userId);
        }
        return merged.size === current.length ? current : [...merged];
      });
      setNames(await resolveActorNames(page.items));
    } catch (err) {
      setEvents([]);
      setTotal(0);
      setError(
        err instanceof ListingsApiError
          ? err.message
          : "failed to load the audit log",
      );
    }
  }, []);

  useEffect(() => {
    void load(filters, offset);
  }, [filters, offset, load]);

  function update(patch: Partial<Filters>) {
    setOffset(0);
    setFilters((current) => ({ ...current, ...patch }));
  }

  const actorOptions = useMemo(
    () =>
      actorIds
        .map((id) => ({ id, label: names.get(id) ?? shortId(id) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [actorIds, names],
  );

  const filtered = isFiltered(filters);
  const showing = events?.length ?? 0;

  function actorLabel(event: AuditEvent): string {
    if (event.userId === null) return "System";
    return names.get(event.userId) ?? shortId(event.userId);
  }

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1.5">
          <Label htmlFor="audit-entity-type">Entity</Label>
          <Select
            value={filters.entityType}
            onValueChange={(v) =>
              v && update({ entityType: v as Filters["entityType"] })
            }
          >
            <SelectTrigger id="audit-entity-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All entities</SelectItem>
              <SelectItem value="listing">Listings</SelectItem>
              <SelectItem value="claim">Claims</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="audit-actor">Actor</Label>
          <Select
            value={filters.userId}
            onValueChange={(v) => v && update({ userId: v })}
          >
            <SelectTrigger id="audit-actor" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value={ALL}>Anyone</SelectItem>
              {actorOptions.map((actor) => (
                <SelectItem key={actor.id} value={actor.id}>
                  {actor.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Actors seen in loaded results. System events have no actor, so
            choosing one never returns them.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="audit-from">From</Label>
          <Input
            id="audit-from"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => update({ from: e.target.value })}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="audit-to">To</Label>
          <Input
            id="audit-to"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => update({ to: e.target.value })}
          />
        </div>

        {filtered && (
          <div className="sm:col-span-2 lg:col-span-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOffset(0);
                setFilters(emptyFilters);
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {events === null && (
        <div className="grid gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {events?.length === 0 && !error && (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {filtered
              ? "No audit events match these filters."
              : "No audit events have been recorded yet."}
          </p>
        </div>
      )}

      {/* Small screens: one card per event. */}
      {events && events.length > 0 && (
        <div className="grid gap-3 md:hidden">
          {events.map((event) => (
            <div
              key={event.id}
              role="button"
              tabIndex={0}
              onClick={() => setDetail(event)}
              onKeyDown={(e) => e.key === "Enter" && setDetail(event)}
              className="grid cursor-pointer gap-2 rounded-lg border bg-card p-4 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <Badge variant={actionTone(event.action)}>
                  {actionLabel(event.action)}
                </Badge>
                <span
                  className="shrink-0 text-xs text-muted-foreground"
                  title={absolute(event.createdAt)}
                >
                  {timeAgo(event.createdAt)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {actorLabel(event)} &middot; {event.entityType}{" "}
                <span className="font-mono">{shortId(event.entityId)}</span>
              </p>
              {event.reason && <p className="text-sm">{event.reason}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Medium and up: the full table. */}
      {events && events.length > 0 && (
        <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow
                  key={event.id}
                  className="cursor-pointer"
                  onClick={() => setDetail(event)}
                >
                  <TableCell
                    className="whitespace-nowrap"
                    title={absolute(event.createdAt)}
                  >
                    {timeAgo(event.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={actionTone(event.action)}>
                      {actionLabel(event.action)}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={
                      event.userId === null ? "text-muted-foreground" : ""
                    }
                  >
                    {actorLabel(event)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="capitalize">{event.entityType}</span>{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {shortId(event.entityId)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-64 truncate" title={event.reason}>
                    {event.reason || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {events && events.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {offset + 1}&ndash;{offset + showing} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + showing >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AuditEntitySheet
        event={detail}
        names={names}
        onClose={() => setDetail(null)}
      />
    </section>
  );
}
