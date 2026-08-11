import Link from "next/link";
import { forbidden } from "next/navigation";
import type { Metadata } from "next";

import { getMe, type Me } from "@/lib/profile";
import { listListings, type Listing } from "@/lib/listings";
import { requireSession } from "@/lib/session";
import { AnimateIn } from "@/components/animate-in";
import { ListingCards } from "@/components/listings/listing-cards";
import { RequestDialog } from "@/components/browse/request-dialog";
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

export default async function BrowsePage() {
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

  let listings: Listing[] = [];
  let unavailable = false;
  try {
    const page = await listListings(session.idToken!, {
      status: "available",
      sortBy: "useBy",
      sortOrder: "asc",
      limit: 60,
    });
    listings = page.items;
  } catch {
    unavailable = true;
  }

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
            <ListingCards
              listings={listings}
              showStatus={false}
              empty="Nothing available right now. Check back after the next drop-off."
              action={(listing) => <RequestDialog listing={listing} />}
            />
          </div>
        )}
      </AnimateIn>
    </PageShell>
  );
}
