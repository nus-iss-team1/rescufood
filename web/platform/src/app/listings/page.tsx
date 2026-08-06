import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { getMe, type Me } from "@/lib/profile";
import {
  listingStatuses,
  mockListings,
  type ListingStatus,
} from "@/lib/mock-listings";
import { AnimateIn } from "@/components/animate-in";
import { PageHeader, describeOrg } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { ListingList } from "@/components/listings/listing-list";
import { Button, buttonVariants } from "@rescufood/ui/components/button";
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
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

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

  const { status } = await searchParams;
  const active: (typeof tabs)[number] = tabs.includes(
    status as (typeof tabs)[number],
  )
    ? (status as (typeof tabs)[number])
    : "all";
  const listings =
    active === "all"
      ? mockListings
      : mockListings.filter((l) => l.status === (active as ListingStatus));

  return shell(
    <AnimateIn className="flex flex-col gap-6">
      <PageHeader
        title="Your listings"
        subtitle={describeOrg(me)}
        action={<Button disabled>Post surplus food</Button>}
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Your listings" },
        ]}
      />

      <nav data-animate="field" className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const count =
            tab === "all"
              ? mockListings.length
              : mockListings.filter((l) => l.status === tab).length;
          return (
            <Link
              key={tab}
              href={tab === "all" ? "/listings" : `/listings?status=${tab}`}
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
      </nav>

      {/* The list scrolls inside its own region: the header and filters
          stay put, and scrollsmoother rules out position sticky. */}
      <div
        data-animate="field"
        className="max-h-[60vh] overflow-y-auto pr-1 sm:max-h-[62vh]"
      >
        <ListingList listings={listings} />
      </div>
    </AnimateIn>,
  );
}
