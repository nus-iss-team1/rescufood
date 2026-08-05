import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Org, User } from "@rescufood/profile-sdk";

import { Badge } from "@rescufood/ui/components/badge";
import { Button } from "@rescufood/ui/components/button";
import { Separator } from "@rescufood/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@rescufood/ui/components/sheet";
import { Skeleton } from "@rescufood/ui/components/skeleton";

import { client, ApiError } from "./api";
import { ReasonDialog } from "./ReasonDialog";
import { timeAgo } from "./lib/time";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

export function OrgDetailSheet({
  org,
  onClose,
}: {
  org: Org | null;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<User[] | null>(null);
  const [pending, setPending] = useState<{ user: User; suspend: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!org) return;
    setMembers(null);
    client
      .listOrgMembers(org.id)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [org]);

  async function confirmMemberAction(reason: string) {
    if (!org || !pending) return;
    setBusy(true);
    try {
      if (pending.suspend) {
        await client.suspendUser(pending.user.id, reason);
      } else {
        await client.reactivateUser(pending.user.id, reason);
      }
      toast.success(
        `${pending.user.email || pending.user.name} ${pending.suspend ? "suspended" : "reactivated"}`
      );
      setPending(null);
      setMembers(await client.listOrgMembers(org.id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "action failed");
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={org !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        {org && (
          <>
            <SheetHeader>
              <SheetTitle>{org.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <Badge variant={org.type === "donor" ? "default" : "secondary"}>
                  {org.type === "donor" ? "Donor" : "Rescue partner"}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {org.status}
                </Badge>
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 px-4">
              <dl className="grid gap-3">
                <Field label="Email domain" value={org.domain} />
                <Field label="Contact email" value={org.contact_email} />
                <Field label="Contact phone" value={org.contact_phone} />
                <Field label="Address" value={org.address} />
                <Field label="Description" value={org.description} />
                <Field
                  label="Registered"
                  value={`${timeAgo(org.created_at)} (${new Date(org.created_at).toLocaleString()})`}
                />
              </dl>

              <Separator />

              <div className="grid gap-2">
                <h3 className="text-sm font-medium">
                  Members{members ? ` (${members.length})` : ""}
                </h3>
                {members === null && (
                  <div className="grid gap-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                )}
                {members?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nobody has signed up under this organisation yet.
                  </p>
                )}
                {members?.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{m.name || m.email}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.email}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {m.status === "suspended" && (
                        <Badge variant="destructive">suspended</Badge>
                      )}
                      {m.is_admin ? (
                        <Badge variant="outline">admin</Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() =>
                            setPending({ user: m, suspend: m.status === "active" })
                          }
                        >
                          {m.status === "active" ? "Suspend" : "Reactivate"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ReasonDialog
              title={
                pending
                  ? `${pending.suspend ? "Suspend" : "Reactivate"} ${pending.user.email || pending.user.name}`
                  : ""
              }
              open={pending !== null}
              busy={busy}
              onCancel={() => setPending(null)}
              onConfirm={(reason) => void confirmMemberAction(reason)}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
