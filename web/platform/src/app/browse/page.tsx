import Link from "next/link";
import { forbidden } from "next/navigation";
import type { Metadata } from "next";
import { SearchX } from "lucide-react";

import { getMe, type Me } from "@/lib/profile";
import { listListings, type Listing } from "@/lib/listings";
import { requireSession } from "@/lib/session";
import { AnimateIn } from "@/components/animate-in";
import { ListingCards } from "@/components/listings/listing-cards";
import { ListingFilters } from "@/components/listings/listing-filters";
import { PageHeader, describeOrg } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@rescufood/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { cn } from "@/lib/utils";
import {
  filterListings,
  isFilterActive,
  type ListingFilterParams,
} from "@/lib/filter-listings";

export const metadata: Metadata = {
  title: "Find surplus food — RescuFood",
};

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

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{
    area?: string;
    category?: string;
    minQty?: string;
    pickupWindow?: string;
    pickupBefore?: string;
  }>;
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
            Claiming belongs to an organisation.{" "}
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
  if (me.org.status !== "approved") {
    return (
      <Notice
        title="Registration under review"
        body={`${me.org.name} can claim listings once an administrator approves it.`}
      />
    );
  }
  if (me.org.type !== "rescue_partner") {
    forbidden();
  }

  const rawParams = await searchParams;
  const filters: ListingFilterParams = {
    area: rawParams.area,
    category: rawParams.category,
    minQty: rawParams.minQty,
    pickupWindow: rawParams.pickupWindow,
    pickupBefore: rawParams.pickupBefore,
  };

  let listings: Listing[] = [];
  let unavailable = false;
  try {
    const page = await listListings(session.idToken!, {
      status: "available",
      sortBy: "useBy",
      sortOrder: "asc",
      limit: 100,
    });
    listings = page.items;
  } catch {
    unavailable = true;
  }

  const filteredListings = filterListings(listings, filters);
  const activeFilters = isFilterActive(filters);

  return (
    <PageShell>
      <AnimateIn className="flex flex-col gap-6">
        <PageHeader
          title="Find surplus food"
          subtitle={describeOrg(me)}
          action={
            <Link
              href="/requests"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Your requests
            </Link>
          }
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Find surplus food" },
          ]}
        />

        {!unavailable && (
          <div data-animate="field">
            <ListingFilters />
          </div>
        )}

        {unavailable ? (
          <Card data-animate="field" className="mx-auto w-full max-w-lg">
            <CardHeader>
              <CardTitle>Listings service unavailable</CardTitle>
              <CardDescription>
                We couldn&apos;t load what is on offer. Please try again
                shortly.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div data-animate="field">
            {filteredListings.length === 0 && activeFilters ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-10 text-center shadow-xs">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                  <SearchX className="size-6" />
                </div>
                <h3 className="text-base font-medium text-foreground">
                  No surplus food matches your criteria
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Try adjusting or clearing your filters to see more available listings.
                </p>
                <Link
                  href="/browse"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "mt-4 rounded-full",
                  )}
                >
                  Reset all filters
                </Link>
              </div>
            ) : (
              <ListingCards
                listings={filteredListings}
                showStatus={false}
                empty="Nothing available right now. Check back after the next drop-off."
                action={(listing) => (
                  <Link
                    href={`/browse/${listing.id}`}
                    className={cn(buttonVariants({ size: "sm" }), "w-full")}
                  >
                    View Details
                  </Link>
                )}
              />
            )}
          </div>
        )}
      </AnimateIn>
    </PageShell>
  );
}
