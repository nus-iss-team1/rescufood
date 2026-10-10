import Link from "next/link";
import { forbidden } from "next/navigation";
import type { Metadata } from "next";
import { LayoutGrid, Rows3 } from "lucide-react";

import { getMe, type Me } from "@/lib/profile";
import { requireSession } from "@/lib/session";
import { listingStatuses, type ListingStatus } from "@rescufood/listings-sdk";
import { listListings, type Listing } from "@/lib/listings";
import { AnimateIn } from "@/components/animate-in";
import { PageHeader, describeOrg } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { ListingsView } from "@/components/listings/listings-view";
import { buttonVariants } from "@rescufood/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { cn } from "@/lib/utils";
import { segmentedItem, segmentedTrack } from "@/lib/segmented";
import { StatusFilter } from "@/components/filters/status-filter";

export const metadata: Metadata = {
  title: "Your listings — RescuFood",
};

const tabs = ["all", ...listingStatuses] as const;

const views = [
  { key: "list", label: "List view", Icon: Rows3 },
  { key: "card", label: "Card view", Icon: LayoutGrid },
] as const;

function Notice({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string }>;
}) {
  const session = await requireSession();

  let me: Me | null = null;
  if (session.idToken) {
    try {
      me = await getMe(session.idToken);
    } catch {
      // Falls through to the unavailable notice below.
    }
  }

  const shell = (children: React.ReactNode) => (
    <PageShell>{children}</PageShell>
  );

  if (!me) {
    return shell(
      <Notice
        title="Profile service unavailable"
        body="We couldn't confirm your organisation. Please try again shortly."
      />,
    );
  }
  if (!me.org) {
    return shell(
      <Notice
        title="No organisation found"
        body={
          <>
            Listings belong to an organisation.{" "}
            <Link
              href="/register-organisation"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Register yours
            </Link>
            .
          </>
        }
      />,
    );
  }
  if (me.org.status !== "approved") {
    return shell(
      <Notice
        title="Registration under review"
        body={`${me.org.name} can post listings once an administrator approves it.`}
      />,
    );
  }
  if (me.org.type !== "donor") {
    forbidden();
  }

  const { status, view } = await searchParams;
  const active: (typeof tabs)[number] = tabs.includes(
    status as (typeof tabs)[number],
  )
    ? (status as (typeof tabs)[number])
    : "all";
  const layout: (typeof views)[number]["key"] =
    view === "card" ? "card" : "list";

  // Each control keeps the other's selection; defaults stay out of the url.
  const href = (next: { status?: string; view?: string }) => {
    const params = new URLSearchParams();
    const s = next.status ?? active;
    const v = next.view ?? layout;
    if (s !== "all") params.set("status", s);
    if (v !== "list") params.set("view", v);
    const qs = params.toString();
    return qs ? `/listings?${qs}` : "/listings";
  };
  // Every status, so the tab counts are right; the service has no
  // "my organisation" filter beyond the donor's name.
  let all: Listing[] = [];
  let unavailable = false;
  try {
    const page = await listListings(session.idToken!, {
      donorOrgName: me.org.name,
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 100,
    });
    all = page.items;
  } catch {
    unavailable = true;
  }
  const listings =
    active === "all"
      ? all
      : all.filter((l) => l.status === (active as ListingStatus));

  return shell(
    <AnimateIn className="flex flex-col gap-6">
      <PageHeader
        title="Your listings"
        subtitle={describeOrg(me)}
        action={
          <Link href="/listings/new" className={cn(buttonVariants())}>
            Create listing
          </Link>
        }
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Your listings" },
        ]}
      />

      <nav
        data-animate="field"
        className="flex items-start justify-between gap-3"
      >
        <StatusFilter
          basePath="/listings"
          active={active}
          view={layout}
          options={tabs.map((tab) => ({
            value: tab,
            label: tab === "all" ? "All statuses" : tab,
            count:
              tab === "all"
                ? all.length
                : all.filter((l) => l.status === tab).length,
          }))}
        />

        <div className={cn(segmentedTrack, "shrink-0")} role="group" aria-label="View">
          {views.map(({ key, label, Icon }) => (
            <Link
              key={key}
              href={href({ view: key })}
              aria-current={key === layout ? "true" : undefined}
              title={label}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                segmentedItem(key === layout),
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span className="sr-only">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div data-animate="field" className="px-1 pb-4">
        {unavailable ? (
          <Notice
            title="Listings service unavailable"
            body="We couldn't load your listings. Please try again shortly."
          />
        ) : (
          <ListingsView
            // Remount on tab change so the reveal count starts over.
            key={active}
            listings={listings}
            layout={layout}
          />
        )}
      </div>
    </AnimateIn>,
  );
}
