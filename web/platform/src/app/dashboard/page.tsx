import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BarChart3, PackagePlus, Search } from "lucide-react";

import { auth } from "@/auth";
import { signOutAction } from "@/app/actions";
import { getMe, ProfileApiError, type Me, type Org } from "@/lib/profile";
import { AnimateIn } from "@/components/animate-in";
import { OrgRegistrationForm } from "@/components/org/registration-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard — RescuFood",
};

const quickActions = [
  {
    icon: PackagePlus,
    title: "Post surplus food",
    description:
      "Publish a surplus lot with quantity, allergens, and a pickup window.",
  },
  {
    icon: Search,
    title: "Find & claim food",
    description: "Browse available listings near you and reserve a lot.",
  },
  {
    icon: BarChart3,
    title: "Your activity",
    description: "Listings, claims, and pickups will show up here.",
  },
];

function SignInAgain({ message }: { message: string }) {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Please sign in again</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signOutAction}>
          <Button type="submit" className="w-full">
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function OrgStatusNotice({ org }: { org: Org }) {
  const notices: Record<string, { title: string; body: string }> = {
    pending: {
      title: "Registration under review",
      body: `${org.name} is waiting for an administrator to approve it. You'll be able to use the platform once it's approved.`,
    },
    rejected: {
      title: "Registration rejected",
      body: `${org.name} was not approved. Contact the platform administrators if you believe this is a mistake.`,
    },
    suspended: {
      title: "Organisation suspended",
      body: `${org.name} is currently suspended. Contact the platform administrators for details.`,
    },
  };
  const notice = notices[org.status];

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{notice.title}</CardTitle>
        <CardDescription>{notice.body}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function ApprovedDashboard() {
  return (
    <AnimateIn className="mx-auto grid w-full max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <Card
            key={action.title}
            aria-disabled
            data-animate="field"
            className="opacity-60"
          >
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <Icon className="size-5" aria-hidden />
              </div>
              <CardAction>
                <Badge variant="secondary">Coming soon</Badge>
              </CardAction>
              <CardTitle className="mt-3">{action.title}</CardTitle>
              <CardDescription>{action.description}</CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </AnimateIn>
  );
}

function RegistrationSection({ me, groups }: { me: Me; groups: string[] }) {
  const defaultType = groups.includes("rescue-partner")
    ? "rescue_partner"
    : "donor";
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          Register your organisation
        </h2>
        <p className="text-muted-foreground">
          RescuFood works between approved organisations. Tell us who you
          are — an administrator reviews every registration, and once
          approved your whole team can work under one roof.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <OrgRegistrationForm
            defaultType={defaultType}
            defaultEmail={me.email}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const { name, email, username, groups } = session.user;

  let me: Me | null = null;
  let staleSession = !session.idToken;
  let apiDown = false;
  if (session.idToken) {
    try {
      me = await getMe(session.idToken);
    } catch (err) {
      if (err instanceof ProfileApiError && err.status === 401) {
        staleSession = true;
      } else {
        apiDown = true;
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="px-6 py-16 sm:py-20">
          <AnimateIn className="mx-auto flex w-full max-w-5xl flex-col gap-4">
            <div data-animate="field" className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome{name ? `, ${name}` : ""}
              </h1>
              {me?.org ? (
                <>
                  <Badge variant="secondary">{me.org.name}</Badge>
                  <Badge variant="outline">
                    {me.org.type === "donor" ? "Donor" : "Rescue partner"}
                  </Badge>
                </>
              ) : groups?.length ? (
                groups.map((group) => (
                  <Badge key={group} variant="secondary">
                    {group}
                  </Badge>
                ))
              ) : null}
            </div>
            <p data-animate="field" className="text-muted-foreground">
              Signed in as {username ?? email}
              {email && username ? ` (${email})` : ""}.
            </p>
          </AnimateIn>
        </section>

        <section className="border-t border-border bg-secondary/40 px-6 py-16 sm:py-20">
          {staleSession ? (
            <SignInAgain message="Your session predates the latest update or has expired, so we can't reach your profile." />
          ) : apiDown ? (
            <Card className="mx-auto w-full max-w-md">
              <CardHeader>
                <CardTitle>Profile service unavailable</CardTitle>
                <CardDescription>
                  We couldn&apos;t load your organisation right now. Please
                  try again shortly.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : me?.is_admin ? (
            <Card className="mx-auto w-full max-w-md">
              <CardHeader>
                <CardTitle>Platform administrator</CardTitle>
                <CardDescription>
                  Organisation approvals live in the admin console.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : me && me.org === null ? (
            <RegistrationSection me={me} groups={groups ?? []} />
          ) : me?.org && me.org.status !== "approved" ? (
            <OrgStatusNotice org={me.org} />
          ) : (
            <ApprovedDashboard />
          )}
        </section>
      </main>

      <footer className="w-full border-t border-border py-6">
        <p className="text-center text-sm text-muted-foreground">
          RescuFood — a NUS-ISS Team 1 project
        </p>
      </footer>
    </div>
  );
}
