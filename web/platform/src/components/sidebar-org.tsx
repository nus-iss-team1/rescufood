import { Building2, Mail, MapPin, Phone, Users } from "lucide-react";

import type { Org } from "@/lib/profile";
import { ApprovedMark } from "@/components/dashboard/approved-mark";
import { Badge } from "@rescufood/ui/components/badge";

function Line({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-xs text-sidebar-foreground/70">
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

/** The organisation the viewer acts for, with how to reach it. */
export function SidebarOrg({
  org,
  memberCount,
}: {
  org: Org;
  memberCount: number;
}) {
  return (
    <div className="grid gap-2 rounded-lg bg-sidebar-accent/40 p-3">
      <div className="flex items-start gap-2">
        <Building2
          className="mt-0.5 size-4 shrink-0 text-sidebar-foreground/70"
          aria-hidden
        />
        <span className="min-w-0 flex-1 text-sm font-medium break-words text-sidebar-foreground">
          {org.name}
        </span>
        {org.status === "approved" && <ApprovedMark />}
      </div>

      <Badge variant="secondary" className="w-fit">
        {org.type === "donor" ? "Food donor" : "Rescue partner"}
      </Badge>

      <div className="grid gap-1.5 pt-1">
        <Line icon={Mail}>{org.contact_email}</Line>
        {org.contact_phone && <Line icon={Phone}>{org.contact_phone}</Line>}
        {org.address && <Line icon={MapPin}>{org.address}</Line>}
        {memberCount > 0 && (
          <Line icon={Users}>
            {memberCount} member{memberCount > 1 ? "s" : ""}
          </Line>
        )}
      </div>
    </div>
  );
}
