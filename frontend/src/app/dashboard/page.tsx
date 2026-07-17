import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BarChart3, PackagePlus, Search } from "lucide-react";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
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

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const { name, email, username, groups } = session.user;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="px-6 py-16 sm:py-20">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome{name ? `, ${name}` : ""}
              </h1>
              {groups?.length ? (
                groups.map((group) => (
                  <Badge key={group} variant="secondary">
                    {group}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary">No role assigned yet</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Signed in as {username ?? email}
              {email && username ? ` (${email})` : ""}. Your
              organisation&apos;s workspace will live here as the platform is
              built out.
            </p>
          </div>
        </section>

        <section className="border-t border-border bg-secondary/40 px-6 py-16 sm:py-20">
          <div className="mx-auto grid w-full max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card key={action.title} aria-disabled className="opacity-60">
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
          </div>
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
