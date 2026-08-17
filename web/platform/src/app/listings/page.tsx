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
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const count =
              tab === "all"
                ? all.length
                : all.filter((l) => l.status === tab).length;
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

        <div className="flex shrink-0 gap-1" role="group" aria-label="View">
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
        {unavailable ? (
          <Notice
            title="Listings service unavailable"
            body="We couldn't load your listings. Please try again shortly."
          />
        ) : layout === "card" ? (
          <ListingCards
            listings={listings}
            empty="No listings here yet."
            action={(listing) => (
              <Link
                href={`/listings/${listing.id}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-full",
                )}
              >
                View / Edit
              </Link>
            )}
          />
        ) : (
          <ListingList
            listings={listings}
            empty="No listings here yet."
            action={(listing) => (
              <Link
                href={`/listings/${listing.id}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                View / Edit
              </Link>
            )}
          />
        )}
      </div>
    </AnimateIn>,
  );
}
