import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireSession } from "@/lib/session";
import { getMe } from "@/lib/profile";
import { getRequest, getListing, ListingsApiError } from "@/lib/listings";
import { PageShell } from "@/components/page-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription } from "@rescufood/ui/components/card";
import { RequestDetailView } from "@/components/requests/request-detail-view";

export const metadata: Metadata = {
  title: "Request Details — RescuFood",
};

export default async function RequestDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const idToken = session.idToken;

  if (!idToken) {
    return (
      <PageShell>
        <Card className="mx-auto w-full max-w-lg mt-8">
          <CardHeader>
            <CardTitle>Session Expired</CardTitle>
            <CardDescription>Please sign in again to view this request.</CardDescription>
          </CardHeader>
        </Card>
      </PageShell>
    );
  }

  let me;
  try {
    me = await getMe(idToken);
  } catch {
    return (
      <PageShell>
        <Card className="mx-auto w-full max-w-lg mt-8">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Could not load user profile.</CardDescription>
          </CardHeader>
        </Card>
      </PageShell>
    );
  }

  if (!me.org || me.org.status !== "approved") {
    return (
      <PageShell>
        <Card className="mx-auto w-full max-w-lg mt-8">
          <CardHeader>
            <CardTitle>Forbidden</CardTitle>
            <CardDescription>Your organization must be approved to view requests.</CardDescription>
          </CardHeader>
        </Card>
      </PageShell>
    );
  }

  let request;
  try {
    request = await getRequest(idToken, id);
  } catch (err) {
    if (err instanceof ListingsApiError && err.status === 404) {
      notFound();
    }
    return (
      <PageShell>
        <Card className="mx-auto w-full max-w-lg mt-8">
          <CardHeader>
            <CardTitle>Not Found</CardTitle>
            <CardDescription>The requested resource could not be found or loaded.</CardDescription>
          </CardHeader>
        </Card>
      </PageShell>
    );
  }

  let listing;
  try {
    listing = await getListing(idToken, request.listingId);
  } catch {
    return (
      <PageShell>
        <Card className="mx-auto w-full max-w-lg mt-8">
          <CardHeader>
            <CardTitle>Not Found</CardTitle>
            <CardDescription>The associated listing could not be found.</CardDescription>
          </CardHeader>
        </Card>
      </PageShell>
    );
  }

  // Guard access: verify listing.donorOrgId === me.org.id OR request.rescueOrgId === me.org.id
  if (listing.donorOrgId !== me.org.id && request.rescueOrgId !== me.org.id) {
    return (
      <PageShell>
        <Card className="mx-auto w-full max-w-lg mt-8 border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">403 Forbidden</CardTitle>
            <CardDescription>You do not have permission to view this request.</CardDescription>
          </CardHeader>
        </Card>
      </PageShell>
    );
  }

  const isDonor = listing.donorOrgId === me.org.id;

  return (
    <PageShell className="max-w-2xl">
      <PageHeader
        title={listing.description || "Request details"}
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Your requests", href: "/requests" },
          { label: listing.description || "Request details" },
        ]}
      />
      <div className="mt-8">
        <RequestDetailView
          request={request}
          listing={listing}
          isDonor={isDonor}
        />
      </div>
    </PageShell>
  );
}
