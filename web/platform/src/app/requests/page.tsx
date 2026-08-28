import Link from "next/link";
import type { Metadata } from "next";
import { LayoutGrid, Rows3 } from "lucide-react";

import { getMe, type Me } from "@/lib/profile";
import {
  listListings,
  listRequests,
  type Listing,
  type ListingRequest,
} from "@/lib/listings";
import { requestStatuses } from "@rescufood/listings-sdk";
import { requireSession } from "@/lib/session";
import { AnimateIn } from "@/components/animate-in";
import { PageHeader, describeOrg } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { RequestCards } from "@/components/requests/request-cards";
import { RequestList } from "@/components/requests/request-list";
import { requestStatusLabels } from "@/lib/listing-labels";
import { buttonVariants } from "@rescufood/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your requests — RescuFood",
};

const tabs = ["all", ...requestStatuses] as const;

const views = [
  { key: "list", label: "List view", Icon: Rows3 },
  { key: "card", label: "Card view", Icon: LayoutGrid },
] as const;

function Notice({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <PageShell>
      <AnimateIn>
        <Card className="mx-auto w-full max-w-lg">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{body}</CardDescription>
          </CardHeader>
        </Card>
      </AnimateIn>
    </PageShell>
  );
}

export default async function RequestsPage({
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

  if (!me) {
    return (
      <Notice
        title="Profile service unavailable"
        body="We couldn't confirm your organisation. Please try again shortly."
      />
    );
  }
  if (!me.org) {
    return (
      <Notice
        title="No organisation found"
        body={
          <>
            Requests belong to an organisation.{" "}
            <Link
              href="/register-organisation"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Register yours
            </Link>
            .
          </>
        }
      />
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
    return qs ? `/requests?${qs}` : "/requests";
  };

  // Every status, so the tab counts cover the whole set.
  let all: ListingRequest[] = [];
  let unavailable = false;
  try {
    const page = await listRequests(session.idToken!, {
      sortBy: "requestedAt",
      sortOrder: "desc",
      limit: 100,
    });
    all = page.items;
  } catch {
    unavailable = true;
  }
  const requests =
    active === "all" ? all : all.filter((r) => r.status === active);

  // Requests carry only a listingId, so the cards need the listings joined
  // in for their photo and category.
  let listings = new Map<string, Listing>();
  if (!unavailable && layout === "card") {
    try {
      const page = await listListings(session.idToken!, { limit: 100 });
      listings = new Map(page.items.map((l) => [l.id, l]));
    } catch {
      // Cards fall back to the placeholder and the requested quantity.
    }
  }

  return (
    <PageShell>
      <AnimateIn className="flex flex-col gap-6">
        <PageHeader
          title="Your requests"
          subtitle={describeOrg(me)}
          action={
            me.org.type === "rescue_partner" ? (
              <Link href="/browse" className={cn(buttonVariants())}>
                Find surplus food
              </Link>
            ) : undefined
          }
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Your requests" },
          ]}
        />

        {!unavailable && (
          <nav
            data-animate="field"
            className="flex items-start justify-between gap-3"
          >
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const count =
                  tab === "all"
                    ? all.length
                    : all.filter((r) => r.status === tab).length;
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
                    )}
                  >
                    {tab === "all" ? "All" : requestStatusLabels[tab]}
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
        )}

        {unavailable ? (
          <Card data-animate="field" className="mx-auto w-full max-w-lg">
            <CardHeader>
              <CardTitle>Listings service unavailable</CardTitle>
              <CardDescription>
                We couldn&apos;t load your requests. Please try again shortly.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div data-animate="field">
            {layout === "card" ? (
              <RequestCards requests={requests} listings={listings} isDonor={me.org.type === "donor"} />
            ) : (
              <RequestList requests={requests} isDonor={me.org.type === "donor"} />
            )}
          </div>
        )}
      </AnimateIn>
    </PageShell>
  );
}
