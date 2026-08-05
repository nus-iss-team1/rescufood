import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Org, OrgCounts, OrgStatus } from "@rescufood/profile-sdk";

import { Badge } from "@rescufood/ui/components/badge";
import { Button } from "@rescufood/ui/components/button";
import { Input } from "@rescufood/ui/components/input";
import { Skeleton } from "@rescufood/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rescufood/ui/components/table";
import { Tabs, TabsList, TabsTrigger } from "@rescufood/ui/components/tabs";

import { client, ApiError } from "./api";
import { OrgDetailSheet } from "./OrgDetailSheet";
import { ReasonDialog } from "./ReasonDialog";
import { timeAgo } from "./lib/time";

type QueueTab = OrgStatus | "all";

const tabs: QueueTab[] = ["pending", "approved", "suspended", "rejected", "all"];

const actionsByStatus: Record<
  OrgStatus,
  { label: string; run: (id: string, reason: string) => Promise<Org> }[]
> = {
  pending: [
    { label: "Approve", run: (id, r) => client.approveOrg(id, r) },
    { label: "Reject", run: (id, r) => client.rejectOrg(id, r) },
  ],
  approved: [{ label: "Suspend", run: (id, r) => client.suspendOrg(id, r) }],
  suspended: [{ label: "Reactivate", run: (id, r) => client.approveOrg(id, r) }],
  rejected: [],
};

const statusBadge: Record<OrgStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  suspended: "destructive",
  rejected: "outline",
};

interface PendingAction {
  org: Org;
  label: string;
  run: (id: string, reason: string) => Promise<Org>;
}

function typeLabel(org: Org) {
  return org.type === "donor" ? "Donor" : "Rescue partner";
}

export function OrgQueue() {
  const [tab, setTab] = useState<QueueTab>("pending");
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [counts, setCounts] = useState<OrgCounts | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [detail, setDetail] = useState<Org | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (status: QueueTab) => {
    setOrgs(null);
    setError("");
    try {
      const [list, allCounts] = await Promise.all([
        client.listOrgs(status),
        client.countOrgs(),
      ]);
      setOrgs(list);
      setCounts(allCounts);
    } catch (err) {
      setOrgs([]);
      setError(err instanceof ApiError ? err.message : "failed to load organisations");
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  // Filters the loaded page (the api returns at most 100 rows).
  const visible = useMemo(() => {
    if (!orgs) return null;
    const q = query.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter((org) =>
      [org.name, org.domain, org.contact_email, org.address]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [orgs, query]);

  async function confirm(reason: string) {
    if (!pending) return;
    setBusy(true);
    try {
      await pending.run(pending.org.id, reason);
      toast.success(`${pending.org.name} ${pending.label.toLowerCase()}d`);
      setPending(null);
      await load(tab);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "action failed");
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  function actions(org: Org) {
    return actionsByStatus[org.status].map(({ label, run }) => (
      <Button
        key={label}
        variant="outline"
        size="sm"
        onClick={() => setPending({ org, label, run })}
      >
        {label}
      </Button>
    ));
  }

  return (
    <section className="grid gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as QueueTab)}>
        <TabsList className="w-full overflow-x-auto sm:w-auto">
          {tabs.map((t) => {
            const count =
              counts === null
                ? 0
                : t === "all"
                  ? Object.values(counts).reduce((a, b) => a + b, 0)
                  : counts[t];
            return (
              <TabsTrigger key={t} value={t} className="capitalize">
                {t}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1.5">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, domain, email or address"
        aria-label="Search organisations"
        className="sm:max-w-xs"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {visible === null && (
        <div className="grid gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {visible?.length === 0 && !error && (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {query.trim()
              ? `No ${tab === "all" ? "" : tab + " "}organisations match "${query.trim()}".`
              : `No ${tab === "all" ? "" : tab + " "}organisations.`}
          </p>
        </div>
      )}

      {/* Small screens: one card per organisation. */}
      {visible && visible.length > 0 && (
        <div className="grid gap-3 md:hidden">
          {visible.map((org) => (
            <div
              key={org.id}
              role="button"
              tabIndex={0}
              onClick={() => setDetail(org)}
              onKeyDown={(e) => e.key === "Enter" && setDetail(org)}
              className="grid cursor-pointer gap-2 rounded-lg border bg-card p-4 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{org.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {org.domain || "no domain"} · {timeAgo(org.created_at)}
                  </p>
                </div>
                <Badge variant={statusBadge[org.status]} className="shrink-0 capitalize">
                  {org.status}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={org.type === "donor" ? "default" : "secondary"}>
                  {typeLabel(org)}
                </Badge>
                <span className="truncate text-xs text-muted-foreground">
                  {org.contact_email}
                </span>
              </div>
              {actionsByStatus[org.status].length > 0 && (
                <div
                  className="flex flex-wrap gap-2 pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actions(org)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Medium and up: the full table. */}
      {visible && visible.length > 0 && (
        <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                {tab === "all" && <TableHead>Status</TableHead>}
                <TableHead>Domain</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((org) => (
                <TableRow
                  key={org.id}
                  className="cursor-pointer"
                  onClick={() => setDetail(org)}
                >
                  <TableCell>
                    <div className="font-medium">{org.name}</div>
                    {org.description && (
                      <div className="max-w-56 truncate text-xs text-muted-foreground">
                        {org.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.type === "donor" ? "default" : "secondary"}>
                      {typeLabel(org)}
                    </Badge>
                  </TableCell>
                  {tab === "all" && (
                    <TableCell>
                      <Badge variant={statusBadge[org.status]} className="capitalize">
                        {org.status}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell>{org.domain || "—"}</TableCell>
                  <TableCell>
                    {org.contact_email}
                    {org.contact_phone && (
                      <div className="text-xs text-muted-foreground">
                        {org.contact_phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell title={new Date(org.created_at).toLocaleString()}>
                    {timeAgo(org.created_at)}
                  </TableCell>
                  <TableCell
                    className="whitespace-nowrap text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-2">{actions(org)}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ReasonDialog
        title={pending ? `${pending.label} ${pending.org.name}` : ""}
        open={pending !== null}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={(reason) => void confirm(reason)}
      />

      <OrgDetailSheet org={detail} onClose={() => setDetail(null)} />
    </section>
  );
}
