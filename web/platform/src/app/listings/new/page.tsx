import Link from "next/link";
import { forbidden } from "next/navigation";
import type { Metadata } from "next";

import { getMe, type Me } from "@/lib/profile";
import { requireSession } from "@/lib/session";
import { AnimateIn } from "@/components/animate-in";
import { PageHeader, describeOrg } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { CreateListingForm } from "@/components/listings/create-listing-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";

export const metadata: Metadata = {
  title: "Post surplus food — RescuFood",
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

export default async function NewListingPage() {
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
        body={`${me.org.name} can post listings once an administrator approves it.`}
      />
    );
  }
  if (me.org.type !== "donor") {
    forbidden();
  }

  return (
    <PageShell>
      <AnimateIn className="flex flex-col gap-6">
        <PageHeader
          title="Post surplus food"
          subtitle={describeOrg(me)}
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Your listings", href: "/listings" },
            { label: "Post surplus food" },
          ]}
        />

        <Card data-animate="field">
          <CardHeader>
            <CardTitle>Listing details</CardTitle>
            <CardDescription>
              Publishing makes this visible to rescue partners straight away.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateListingForm />
          </CardContent>
        </Card>
      </AnimateIn>
    </PageShell>
  );
}
