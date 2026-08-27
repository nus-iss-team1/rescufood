import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { getMe, type Me } from "@/lib/profile";
import { getListing, ListingsApiError, type Listing } from "@/lib/listings";
import { requireSession } from "@/lib/session";
import { AnimateIn } from "@/components/animate-in";
import { PageHeader, describeOrg } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { ListingDetailView } from "@/components/browse/listing-detail-view";
import { buttonVariants } from "@rescufood/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Surplus Food Details (${id.slice(0, 8)}) — RescuFood`,
  };
}

function Notice({
  title,
  body,
  action,
}: {
  title: string;
  body: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <PageShell>
      <AnimateIn>
        <Card className="mx-auto w-full max-w-lg border-border bg-card shadow-xs">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{body}</CardDescription>
          </CardHeader>
          {action && <CardContent>{action}</CardContent>}
        </Card>
      </AnimateIn>
    </PageShell>
  );
}

export default async function BrowseListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
        action={
          <Link href="/browse" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
            Back to Browse
          </Link>
        }
      />
    );
  }

  if (!me.org) {
    return (
      <Notice
        title="No organisation found"
        body={
          <>
            Claiming surplus food belongs to an organisation.{" "}
            <Link
              href="/register-organisation"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Register yours
            </Link>
            .
          </>
        }
        action={
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
            Back to Dashboard
          </Link>
        }
      />
    );
  }

  if (me.org.status !== "approved") {
    return (
      <Notice
        title="Registration under review"
        body={`${me.org.name} can claim surplus food once an administrator approves it.`}
        action={
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
            Back to Dashboard
          </Link>
        }
      />
    );
  }

  // Role Guard: Only rescue partner organizations can access the pre-claim view
  if (me.org.type !== "rescue_partner" && (me.org.type as string) !== "rescue-partner") {
    return (
      <PageShell>
        <AnimateIn>
          <Card className="mx-auto w-full max-w-lg border-destructive/20 bg-card shadow-xs">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive mb-1">
                <ShieldAlert className="size-5" />
                <CardTitle className="text-xl">403 Forbidden</CardTitle>
              </div>
              <CardDescription>
                Only authorized rescue partner organisations can view surplus food details or claim lots.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "default" }), "w-full")}
              >
                Back to Dashboard
              </Link>
            </CardContent>
          </Card>
        </AnimateIn>
      </PageShell>
    );
  }

  let listing: Listing | null = null;
  try {
    listing = await getListing(session.idToken!, id);
  } catch (err) {
    if (err instanceof ListingsApiError && err.status === 404) {
      return (
        <PageShell>
          <AnimateIn>
            <Card className="mx-auto w-full max-w-lg border-border bg-card shadow-xs">
              <CardHeader>
                <CardTitle className="text-xl">Listing Not Found</CardTitle>
                <CardDescription>
                  The surplus food lot you are looking for does not exist or may have been removed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/browse"
                  className={cn(buttonVariants({ variant: "default" }), "w-full")}
                >
                  Back to Find Surplus Food
                </Link>
              </CardContent>
            </Card>
          </AnimateIn>
        </PageShell>
      );
    }
    return (
      <Notice
        title="Listings service unavailable"
        body="Could not load this listing from the service. Please try again shortly."
        action={
          <Link href="/browse" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
            Back to Find Surplus Food
          </Link>
        }
      />
    );
  }

  if (!listing) {
    return (
      <PageShell>
        <AnimateIn>
          <Card className="mx-auto w-full max-w-lg border-border bg-card shadow-xs">
            <CardHeader>
              <CardTitle className="text-xl">Listing Not Found</CardTitle>
              <CardDescription>
                The surplus food lot you are looking for does not exist or may have been removed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/browse"
                className={cn(buttonVariants({ variant: "default" }), "w-full")}
              >
                Back to Find Surplus Food
              </Link>
            </CardContent>
          </Card>
        </AnimateIn>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <AnimateIn className="flex flex-col gap-6">
        <PageHeader
          title={listing.description || "Listing Details"}
          subtitle={describeOrg(me)}
          action={
            <Link
              href="/browse"
              className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
            >
              <ArrowLeft className="size-4" />
              All Listings
            </Link>
          }
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Find surplus food", href: "/browse" },
            { label: listing.description || "Listing details" },
          ]}
        />

        <div data-animate="field">
          <ListingDetailView listing={listing} />
        </div>
      </AnimateIn>
    </PageShell>
  );
}
