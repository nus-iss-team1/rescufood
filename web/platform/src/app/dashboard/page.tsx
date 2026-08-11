import Link from "next/link";
import type { Metadata } from "next";
import {
  BarChart3,
  Bell,
  PackagePlus,
  QrCode,
  Search,
  ShieldCheck,
} from "lucide-react";

import { signOutAction } from "@/app/actions";
import { requireSession } from "@/lib/session";
import {
  getMe,
  getMyOrgMembers,
  ProfileApiError,
  type Me,
  type Org,
  type User,
} from "@/lib/profile";
import { AnimateIn } from "@/components/animate-in";
import { PageHeader, describeOrg } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { OrgCard } from "@/components/dashboard/org-card";
import { ReviewProgress } from "@/components/dashboard/review-progress";
import { Button, buttonVariants } from "@rescufood/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard — RescuFood",
};

const heroByType = {
  donor: {
    icon: PackagePlus,
    title: "Post surplus food",
    description:
      "Publish a surplus lot with quantity, allergens, handling notes and a pickup window. Rescue partners nearby claim it before it expires.",
  },
  rescue_partner: {
    icon: Search,
    title: "Find & claim surplus food",
    description:
      "Browse available lots by area, category and pickup window, then reserve one for collection. Each claim is yours alone.",
  },
} as const;

const upcoming = [
  { icon: QrCode, label: "Pickup verification with a single-use code" },
  { icon: Bell, label: "Claim, reminder and expiry notifications" },
  { icon: BarChart3, label: "Rescued quantity and activity reporting" },
];

function Notice({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="mx-auto w-full max-w-lg" data-animate="field">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{children}</CardDescription>
      </CardHeader>
      {action && <CardContent>{action}</CardContent>}
    </Card>
  );
}

function Hero({ org }: { org: Org }) {
  const hero = heroByType[org.type];
  const Icon = hero.icon;

  return (
    <Card data-animate="field" className="lg:col-span-2">
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        <CardTitle className="mt-3 text-xl">{hero.title}</CardTitle>
        <CardDescription>{hero.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {org.type === "donor" ? (
          <>
            <Link href="/listings/new" className={cn(buttonVariants())}>
              Create listing
            </Link>
            <Link
              href="/listings"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Your listings
            </Link>
          </>
        ) : (
          <>
            <Link href="/browse" className={cn(buttonVariants())}>
              Find surplus food
            </Link>
            <Link
              href="/requests"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Your requests
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Workspace({ org, members }: { org: Org; members: User[] }) {
  return (
    <>
      <AnimateIn className="grid gap-6 lg:grid-cols-3">
        <Hero org={org} />
        <OrgCard org={org} members={members} />
      </AnimateIn>

      <div className="mt-10">
        <h2 className="text-sm font-medium text-muted-foreground">
          Also coming to your workspace
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {upcoming.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground"
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default async function DashboardPage() {
  const session = await requireSession();

  let me: Me | null = null;
  let members: User[] = [];
  let staleSession = !session.idToken;
  let apiDown = false;

  if (session.idToken) {
    try {
      me = await getMe(session.idToken);
      if (me.org?.status === "approved") {
        members = await getMyOrgMembers(session.idToken);
      }
    } catch (err) {
      if (err instanceof ProfileApiError && err.status === 401) {
        staleSession = true;
      } else if (!me) {
        apiDown = true;
      }
    }
  }

  if (staleSession) {
    return (
      <PageShell>
        <AnimateIn>
          <Notice
            title="Please sign in again"
            action={
              <form action={signOutAction}>
                <Button type="submit" className="w-full">
                  Sign out
                </Button>
              </form>
            }
          >
            Your session has expired, so we can&apos;t reach your profile.
          </Notice>
        </AnimateIn>
      </PageShell>
    );
  }

  if (apiDown || !me) {
    return (
      <PageShell>
        <AnimateIn>
          <Notice title="Profile service unavailable">
            We couldn&apos;t load your organisation right now. Please try again
            shortly.
          </Notice>
        </AnimateIn>
      </PageShell>
    );
  }

  const firstName = me.name?.split(" ")[0] ?? me.email;

  return (
    <PageShell>
      <AnimateIn className="mb-8">
        <PageHeader
          title={`Welcome${firstName ? `, ${firstName}` : ""}`}
          subtitle={describeOrg(me)}
          crumbs={[{ label: "Dashboard" }]}
        />
      </AnimateIn>

      {me.is_admin ? (
        <AnimateIn>
          <Notice title="Platform administrator">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4" aria-hidden />
              Organisation approvals live in the admin console.
            </span>
          </Notice>
        </AnimateIn>
      ) : me.org === null ? (
        <AnimateIn>
          <Notice
            title="No organisation found"
            action={
              <Link
                href="/register-organisation"
                className={cn(buttonVariants(), "w-full")}
              >
                Register your organisation
              </Link>
            }
          >
            Your email ({me.email}) doesn&apos;t match any registered
            organisation&apos;s domain. If your organisation isn&apos;t on
            RescuFood yet, register it first.
          </Notice>
        </AnimateIn>
      ) : me.org.status === "pending" ? (
        <AnimateIn>
          <Card className="mx-auto w-full max-w-lg" data-animate="field">
            <CardHeader>
              <CardTitle>Registration under review</CardTitle>
              <CardDescription>
                An administrator is reviewing {me.org.name}. Your workspace
                opens as soon as it is approved.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ReviewProgress org={me.org} />
              <p className="text-xs text-muted-foreground">
                Submitted {new Date(me.org.created_at).toLocaleString()}.
              </p>
            </CardContent>
          </Card>
        </AnimateIn>
      ) : me.org.status === "approved" ? (
        <Workspace org={me.org} members={members} />
      ) : (
        <AnimateIn>
          <Notice
            title={
              me.org.status === "rejected"
                ? "Registration rejected"
                : "Organisation suspended"
            }
          >
            {me.org.name}{" "}
            {me.org.status === "rejected"
              ? "was not approved."
              : "is currently suspended."}{" "}
            Contact the platform administrators if you believe this is a
            mistake.
          </Notice>
        </AnimateIn>
      )}
    </PageShell>
  );
}
