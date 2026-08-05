import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { api, ApiError } from "./api";
import type { Org, OrgStatus } from "./types";

const tabs: OrgStatus[] = ["pending", "approved", "suspended", "rejected"];

const actionsByStatus: Record<OrgStatus, { label: string; action: string }[]> = {
  pending: [
    { label: "Approve", action: "approve" },
    { label: "Reject", action: "reject" },
  ],
  approved: [{ label: "Suspend", action: "suspend" }],
  suspended: [{ label: "Reactivate", action: "approve" }],
  rejected: [],
};

interface PendingAction {
  org: Org;
  action: string;
  label: string;
}

export function OrgQueue() {
  const [tab, setTab] = useState<OrgStatus>("pending");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async (status: OrgStatus) => {
    setBusy(true);
    setError("");
    try {
      setOrgs(await api<Org[]>(`/admin/orgs/?status=${status}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "failed to load organisations");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  function open(org: Org, action: string, label: string) {
    setReason("");
    setPending({ org, action, label });
  }

  async function confirm() {
    if (!pending || !reason.trim()) return;
    try {
      await api(`/admin/orgs/${pending.org.id}/${pending.action}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setPending(null);
      await load(tab);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `failed to ${pending.action}`);
      setPending(null);
    }
  }

  return (
    <section className="grid gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as OrgStatus)}>
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {busy && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!busy && orgs.length === 0 && (
        <p className="text-sm text-muted-foreground">No {tab} organisations.</p>
      )}

      {orgs.length > 0 && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="font-medium">{org.name}</div>
                    {org.description && (
                      <div className="text-xs text-muted-foreground">{org.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.type === "donor" ? "default" : "secondary"}>
                      {org.type === "donor" ? "Donor" : "Rescue partner"}
                    </Badge>
                  </TableCell>
                  <TableCell>{org.domain || "—"}</TableCell>
                  <TableCell>
                    {org.contact_email}
                    {org.contact_phone && (
                      <div className="text-xs text-muted-foreground">{org.contact_phone}</div>
                    )}
                  </TableCell>
                  <TableCell>{new Date(org.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {actionsByStatus[tab].map(({ label, action }) => (
                      <Button
                        key={action}
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => open(org, action, label)}
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

      <Dialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.label} {pending?.org.name}
            </DialogTitle>
            <DialogDescription>
              A reason is required and kept on record.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button disabled={!reason.trim()} onClick={() => void confirm()}>
              {pending?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
