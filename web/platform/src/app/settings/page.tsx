import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { getMe, type Me } from "@/lib/profile";
import { AnimateIn } from "@/components/animate-in";
import { PageHeader, describeOrg } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { PasswordForm } from "@/components/settings/password-form";
import { Badge } from "@rescufood/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";

export const metadata: Metadata = {
  title: "Settings — RescuFood",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function Profile({ me, username }: { me: Me | null; username?: string }) {
  if (!me) {
    return (
      <CardContent>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load your profile right now. Your sign-in details
          still work; try again shortly.
        </p>
      </CardContent>
    );
  }

  return (
    <CardContent>
      <dl>
        <Row label="Name" value={me.name || "—"} />
        {username && <Row label="Username" value={username} />}
        <Row label="Email" value={me.email || "—"} />
        <Row
          label="Organisation"
          value={
            me.org ? (
              <span className="flex flex-wrap items-center gap-2">
                {me.org.name}
                <Badge variant="secondary">
                  {me.org.type === "donor" ? "Food donor" : "Rescue partner"}
                </Badge>
                {me.org.status !== "approved" && (
                  <Badge variant="outline" className="capitalize">
                    {me.org.status}
                  </Badge>
                )}
              </span>
            ) : (
              "None"
            )
          }
        />
        <Row
          label="Role"
          value={me.is_admin ? "Platform administrator" : "Member"}
        />
        <Row
          label="Account"
          value={<span className="capitalize">{me.status}</span>}
        />
      </dl>
    </CardContent>
  );
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  let me: Me | null = null;
  if (session.idToken) {
    try {
      me = await getMe(session.idToken);
    } catch {
      // Rendered as an unavailable profile below.
    }
  }

  return (
    <PageShell>
      <AnimateIn className="flex flex-col gap-6">
        <PageHeader
          title="Settings"
          subtitle={describeOrg(me)}
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Settings" },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <Card data-animate="field">
            <CardHeader>
              <CardTitle>Your profile</CardTitle>
              <CardDescription>
                Organisation details are managed by the platform administrators.
              </CardDescription>
            </CardHeader>
            <Profile me={me} username={session.user.username} />
          </Card>

          <Card data-animate="field">
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>
                You will stay signed in on this device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>
        </div>
      </AnimateIn>
    </PageShell>
  );
}
