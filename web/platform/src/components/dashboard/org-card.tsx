import { Building2, Mail, MapPin, Phone, Users } from "lucide-react";

import type { Org, User } from "@/lib/profile";
import { Badge } from "@rescufood/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";

function Line({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

export function OrgCard({ org, members }: { org: Org; members: User[] }) {
  return (
    <Card data-animate="field">
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
          <Building2 className="size-5" aria-hidden />
        </div>
        <CardTitle className="mt-3">{org.name}</CardTitle>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="secondary">
            {org.type === "donor" ? "Food donor" : "Rescue partner"}
          </Badge>
          <Badge variant="outline">Approved</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Line icon={Mail}>{org.contact_email}</Line>
        {org.contact_phone && <Line icon={Phone}>{org.contact_phone}</Line>}
        {org.address && <Line icon={MapPin}>{org.address}</Line>}
        {members.length > 0 && (
          <Line icon={Users}>
            {members.length === 1
              ? "You are the only member"
              : `${members.length} members`}
            {members.length > 1 && (
              <span className="text-muted-foreground">
                {" — "}
                {members
                  .slice(0, 3)
                  .map((m) => m.name || m.email)
                  .join(", ")}
                {members.length > 3 && ` +${members.length - 3} more`}
              </span>
            )}
          </Line>
        )}
        {org.domain && (
          <p className="pt-1 text-xs text-muted-foreground">
            Anyone with an @{org.domain} email joins this organisation
            automatically.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
