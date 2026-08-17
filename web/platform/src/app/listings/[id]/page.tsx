import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import type { Metadata } from "next";

import { getMe, type Me } from "@/lib/profile";
import { getListing, ListingsApiError, type Listing } from "@/lib/listings";
import { requireSession } from "@/lib/session";
import { AnimateIn } from "@/components/animate-in";
import { PageHeader, describeOrg } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { EditListingForm } from "@/components/listings/edit-listing-form";
import { Badge } from "@rescufood/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { listingStatusVariant } from "@/lib/listing-labels";

export const metadata: Metadata = {
  title: "View / Edit Listing — RescuFood",
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

export default async function ListingDetailPage({
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
      />
    );
  }
  if (!me.org) {
    return (
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
      />
    );
  }
  if (me.org.status !== "approved") {
    return (
      <Notice
        title="Registration under review"
        body={`${me.org.name} can edit listings once an administrator approves it.`}
      />
    );
  }
  if (me.org.type !== "donor") {
    forbidden();
  }

  let listing: Listing | null = null;
  try {
    listing = await getListing(session.idToken!, id);
  } catch (err) {
    if (err instanceof ListingsApiError && err.status === 404) {
      notFound();
    }
    return (
      <Notice
        title="Listing unavailable"
        body="Could not load this listing from the service. Please try again shortly."
      />
    );
  }

  if (!listing) {
    notFound();
  }

  // Ensure donor only views/edits their own organisation's listings
  if (listing.donorOrgId !== me.org.id) {
    forbidden();
  }

  return (
    <PageShell>
      <AnimateIn className="flex flex-col gap-6">
        <PageHeader
          title={listing.description || "Edit listing"}
          subtitle={describeOrg(me)}
          action={
            <Badge
              variant={listingStatusVariant[listing.status]}
              className="shrink-0 capitalize"
            >
              {listing.status}
            </Badge>
          }
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Your listings", href: "/listings" },
            { label: listing.description || "Listing details" },
          ]}
        />

        <Card data-animate="field">
          <CardHeader>
            <CardTitle>Listing details</CardTitle>
            <CardDescription>
              View and update details, pickup window, or photos for this surplus
              food lot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditListingForm listing={listing} />
          </CardContent>
        </Card>
      </AnimateIn>
    </PageShell>
  );
}
