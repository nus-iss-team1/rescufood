import Link from "next/link";
import type { Metadata } from "next";
import { LayoutGrid, Rows3 } from "lucide-react";

import { getMe, type Me } from "@/lib/profile";
import { requireSession } from "@/lib/session";
import {
  listingStatuses,
  mockListings,
  type ListingStatus,
} from "@/lib/mock-listings";
import { AnimateIn } from "@/components/animate-in";
import { PageHeader, describeOrg } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { ListingCards } from "@/components/listings/listing-cards";
import { ListingList } from "@/components/listings/listing-list";
import { buttonVariants } from "@rescufood/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { cn } from "@/lib/utils";

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
    return shell(
      <Notice
        title="Donors post listings"
        body={`${me.org.name} is a rescue partner, so it claims listings rather than posting them. Browsing and claiming arrives with the listing service.`}
      />,
    );
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
  const listings =
    active === "all"
      ? mockListings
      : mockListings.filter((l) => l.status === (active as ListingStatus));

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
        className="flex flex-wrap items-center justify-between gap-2"
      >
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const count =
              tab === "all"
                ? mockListings.length
                : mockListings.filter((l) => l.status === tab).length;
            return (
              <Link
                key={tab}
                href={href({ status: tab })}
                aria-current={tab === active ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    variant: tab === active ? "default" : "outline",
                    size: "sm",
                  }),
                  "capitalize",
                )}
              >
                {tab}
                {count > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">{count}</span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex gap-1" role="group" aria-label="View">
          {views.map(({ key, label, Icon }) => (
            <Link
              key={key}
              href={href({ view: key })}
              aria-current={key === layout ? "true" : undefined}
              title={label}
              className={cn(
                buttonVariants({
                  variant: key === layout ? "default" : "outline",
                  size: "icon-sm",
                }),
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span className="sr-only">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* The list scrolls inside its own region: the header and filters
          stay put, and scrollsmoother rules out position sticky. */}
      <div
        data-animate="field"
        className="max-h-[60vh] overflow-y-auto px-1 pb-4 sm:max-h-[62vh]"
      >
        {layout === "card" ? (
          <ListingCards listings={listings} />
        ) : (
          <ListingList listings={listings} />
        )}
      </div>
    </AnimateIn>,
  );
}
