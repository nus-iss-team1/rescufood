import { redirect } from "next/navigation";
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

import { auth } from "@/auth";
import { signOutAction } from "@/app/actions";
import {
  getMe,
  getMyOrgMembers,
  ProfileApiError,
  type Me,
  type Org,
  type User,
} from "@/lib/profile";
import { AnimateIn } from "@/components/animate-in";
import { OrgCard } from "@/components/dashboard/org-card";
import { ReviewProgress } from "@/components/dashboard/review-progress";
import { Badge } from "@rescufood/ui/components/badge";
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-24 pb-16">{children}</main>
  );
}

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
        <Button disabled>{hero.title}</Button>
        <Badge variant="secondary">Opens next sprint</Badge>
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
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

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
      <Shell>
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
      </Shell>
    );
  }

  if (apiDown || !me) {
    return (
      <Shell>
        <AnimateIn>
          <Notice title="Profile service unavailable">
            We couldn&apos;t load your organisation right now. Please try
            again shortly.
          </Notice>
        </AnimateIn>
      </Shell>
    );
  }

  const firstName = me.name?.split(" ")[0] ?? me.email;

  return (
    <Shell>
      <AnimateIn className="mb-8 flex flex-wrap items-center gap-3">
        <h1
          data-animate="field"
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Welcome{firstName ? `, ${firstName}` : ""}
        </h1>
        {me.org && (
          <div data-animate="field" className="flex flex-wrap gap-2">
            <Badge variant="secondary">{me.org.name}</Badge>
            <Badge variant="outline">
              {me.org.type === "donor" ? "Food donor" : "Rescue partner"}
            </Badge>
          </div>
        )}
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
    </Shell>
  );
}
