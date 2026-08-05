import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Org, OrgCounts, OrgStatus } from "@rescufood/profile-sdk";

import { Badge } from "@rescufood/ui/components/badge";
import { Button } from "@rescufood/ui/components/button";
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

export function OrgQueue() {
  const [tab, setTab] = useState<QueueTab>("pending");
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [counts, setCounts] = useState<OrgCounts | null>(null);
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

  return (
    <section className="grid gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as QueueTab)}>
        <TabsList>
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {orgs === null && (
        <div className="grid gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {orgs?.length === 0 && !error && (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No {tab} organisations.
          </p>
        </div>
      )}

      {orgs && orgs.length > 0 && (
        <div className="rounded-lg border bg-card">
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
              {orgs.map((org) => (
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
                      {org.type === "donor" ? "Donor" : "Rescue partner"}
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
                    {actionsByStatus[org.status].map(({ label, run }) => (
                      <Button
                        key={label}
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => setPending({ org, label, run })}
                      >
                        {label}
                      </Button>
                    ))}
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
