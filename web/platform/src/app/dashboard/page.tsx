import Link from "next/link";
import type { Metadata } from "next";
import { PackagePlus, Search, ShieldCheck } from "lucide-react";

import { signOutAction } from "@/app/actions";
import { requireSession } from "@/lib/session";
import { longDateTime } from "@/lib/listing-labels";
import {
  getMe,
  getMyOrgMembers,
  ProfileApiError,
  type Me,
  type Org,
  type User,
} from "@/lib/profile";
import { AnimateIn } from "@/components/animate-in";
import { PageHeader, describeOrg } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { RecentRequests } from "@/components/dashboard/recent-requests";
import { VerifyClaimButton } from "@/components/requests/verify-claim-button";
import { ApprovedMark } from "@/components/dashboard/approved-mark";
import { DonorKpis } from "@/components/dashboard/donor-kpis";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import {
  getOrgSummary,
  getRescuedMetrics,
  listListings,
  listRequests,
  type Listing,
  type ListingRequest,
  type OrgSummary,
  type RescuedMetrics,
} from "@/lib/listings";
import { ReviewProgress } from "@/components/dashboard/review-progress";
import { Button, buttonVariants } from "@rescufood/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard — RescuFood",
};

const primaryActionByType = {
  donor: { icon: PackagePlus, label: "New listing", href: "/listings/new" },
  rescue_partner: {
    icon: Search,
    label: "Find surplus food",
    href: "/browse",
  },
} as const;

/** Who you are acting as, its standing and size, under the page title. */
function OrgMeta({ me, members }: { me: Me; members: User[] }) {
  const approved = me.org?.status === "approved";

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {describeOrg(me)}
      {approved && <ApprovedMark />}
      {approved && members.length > 0 && (
        <>
          <span aria-hidden>·</span>
          <span>
            {members.length} member{members.length > 1 ? "s" : ""}
          </span>
        </>
      )}
    </span>
  );
}

/** The actions a role reaches for most, beside the page title. */
function HeaderActions({ org }: { org: Org }) {
  const primary = primaryActionByType[org.type];
  const Icon = primary.icon;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={primary.href} className={cn(buttonVariants())}>
        <Icon className="size-4" aria-hidden />
        {primary.label}
      </Link>
      {org.type === "donor" ? (
        <>
          <Link
            href="/listings"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Your listings
          </Link>
          <VerifyClaimButton variant="outline" />
        </>
      ) : (
        <Link
          href="/requests"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Your requests
        </Link>
      )}
    </div>
  );
}

function Notice({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="mx-auto w-full max-w-lg" data-animate="field">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{children}</CardDescription>
      </CardHeader>
      {action && <CardContent>{action}</CardContent>}
    </Card>
  );
}

function Workspace({
  org,
  recent,
  summary,
  metrics,
  expiring,
  awaitingPickup,
}: {
  org: Org;
  recent: ListingRequest[];
  summary: OrgSummary | null;
  metrics: RescuedMetrics | null;
  expiring: Listing[];
  awaitingPickup: ListingRequest[];
}) {
  const isDonor = org.type === "donor";

  return (
    <>
      {isDonor && (
        <AnimateIn>
          <DonorKpis
            summary={summary}
            metrics={metrics}
            awaitingVerification={awaitingPickup.length}
          />
        </AnimateIn>
      )}

      <AnimateIn className={isDonor ? "mt-6" : undefined}>
        <div className="grid gap-6">
          {isDonor && (
            <NeedsAttention
              expiring={expiring}
              awaitingPickup={awaitingPickup}
            />
          )}
          <RecentRequests requests={recent} />
        </div>
      </AnimateIn>
    </>
  );
}

export default async function DashboardPage() {
  const session = await requireSession();

  let me: Me | null = null;
  let members: User[] = [];
  let recent: ListingRequest[] = [];
  let summary: OrgSummary | null = null;
  let metrics: RescuedMetrics | null = null;
  let expiring: Listing[] = [];
  let awaitingPickup: ListingRequest[] = [];
  let staleSession = !session.idToken;
  let apiDown = false;

  if (session.idToken) {
    const idToken = session.idToken;
    try {
      me = await getMe(idToken);
      if (me.org?.status === "approved") {
        const isDonor = me.org.type === "donor";
        // How far ahead the attention list looks for closing pickup windows.
        const closingBy = new Date(Date.now() + 24 * 3_600_000).toISOString();

        const [
          membersResult,
          summaryResult,
          metricsResult,
          recentResult,
          expiringResult,
          awaitingResult,
        ] = await Promise.allSettled([
          getMyOrgMembers(idToken),
          getOrgSummary(idToken),
          getRescuedMetrics(idToken),
          listRequests(idToken, {
            sortBy: "updatedAt",
            sortOrder: "desc",
            limit: 5,
          }),
          isDonor
            ? listListings(idToken, {
                status: "available",
                pickupWindowEndTo: closingBy,
                sortBy: "pickupWindowEnd",
                sortOrder: "asc",
                limit: 5,
              })
            : Promise.resolve(null),
          isDonor
            ? listRequests(idToken, { status: "active", limit: 5 })
            : Promise.resolve(null),
        ]);

        // Each card degrades to empty on its own; none takes the page down.
        if (membersResult.status === "fulfilled") members = membersResult.value;
        if (summaryResult.status === "fulfilled") summary = summaryResult.value;
        if (metricsResult.status === "fulfilled") metrics = metricsResult.value;
        if (recentResult.status === "fulfilled")
          recent = recentResult.value.items;
        if (expiringResult.status === "fulfilled" && expiringResult.value)
          expiring = expiringResult.value.items;
        if (awaitingResult.status === "fulfilled" && awaitingResult.value)
          awaitingPickup = awaitingResult.value.items;
      }
    } catch (err) {
      if (err instanceof ProfileApiError && err.status === 401) {
        staleSession = true;
      } else if (!me) {
        apiDown = true;
      }
    }
  }

  if (staleSession) {
    return (
      <PageShell>
        <AnimateIn>
          <Notice
            title="Please sign in again"
            action={
              <form action={signOutAction}>
                <Button type="submit" className="w-full">
                  Sign out
                </Button>
              </form>
            }
          >
            Your session has expired, so we can&apos;t reach your profile.
          </Notice>
        </AnimateIn>
      </PageShell>
    );
  }

  if (apiDown || !me) {
    return (
      <PageShell>
        <AnimateIn>
          <Notice title="Profile service unavailable">
            We couldn&apos;t load your organisation right now. Please try again
            shortly.
          </Notice>
        </AnimateIn>
      </PageShell>
    );
  }

  const firstName = me.name?.split(" ")[0] ?? me.email;

  return (
    <PageShell>
      <AnimateIn className="mb-8">
        <PageHeader
          title={`Welcome${firstName ? `, ${firstName}` : ""}`}
          subtitle={<OrgMeta me={me} members={members} />}
          crumbs={[{ label: "Dashboard" }]}
          action={
            me.org?.status === "approved" ? (
              <HeaderActions org={me.org} />
            ) : undefined
          }
        />
      </AnimateIn>

      {me.is_admin ? (
        <AnimateIn>
          <Notice title="Platform administrator">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4" aria-hidden />
              Organisation approvals live in the admin console.
            </span>
          </Notice>
        </AnimateIn>
      ) : me.org === null ? (
        <AnimateIn>
          <Notice
            title="No organisation found"
            action={
              <Link
                href="/register-organisation"
                className={cn(buttonVariants(), "w-full")}
              >
                Register your organisation
              </Link>
            }
          >
            Your email ({me.email}) doesn&apos;t match any registered
            organisation&apos;s domain. If your organisation isn&apos;t on
            RescuFood yet, register it first.
          </Notice>
        </AnimateIn>
      ) : me.org.status === "pending" ? (
        <AnimateIn>
          <Card className="mx-auto w-full max-w-lg" data-animate="field">
            <CardHeader>
              <CardTitle>Registration under review</CardTitle>
              <CardDescription>
                An administrator is reviewing {me.org.name}. Your workspace
                opens as soon as it is approved.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ReviewProgress org={me.org} />
              <p className="text-xs text-muted-foreground">
                Submitted {longDateTime(me.org.created_at)}.
              </p>
            </CardContent>
          </Card>
        </AnimateIn>
      ) : me.org.status === "approved" ? (
        <Workspace
          org={me.org}
          recent={recent}
          summary={summary}
          metrics={metrics}
          expiring={expiring}
          awaitingPickup={awaitingPickup}
        />
      ) : (
        <AnimateIn>
          <Notice
            title={
              me.org.status === "rejected"
                ? "Registration rejected"
                : "Organisation suspended"
            }
          >
            {me.org.name}{" "}
            {me.org.status === "rejected"
              ? "was not approved."
              : "is currently suspended."}{" "}
            Contact the platform administrators if you believe this is a
            mistake.
          </Notice>
        </AnimateIn>
      )}
    </PageShell>
  );
}
