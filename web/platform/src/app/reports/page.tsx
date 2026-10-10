import type { Metadata } from "next";

import { requireSession } from "@/lib/session";
import { getMe, ProfileApiError, type Me } from "@/lib/profile";
import { AnimateIn } from "@/components/animate-in";
import { PageHeader, describeOrg } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { ReportKpis } from "@/components/reports/report-kpis";
import { StatusDonut, type DonutSlice } from "@/components/reports/status-donut";
import { ClaimsTrend } from "@/components/reports/claims-trend";
import { toTrend } from "@/lib/claims-trend";
import { ListingPerformance } from "@/components/reports/listing-performance";
import { toPerformance } from "@/lib/listing-performance";
import { RefreshControl } from "@/components/reports/refresh-control";
import {
  getOrgSummary,
  getRescuedMetrics,
  listRequests,
  type OrgSummary,
  type RescuedMetrics,
} from "@/lib/listings";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";

export const metadata: Metadata = {
  title: "Reports — RescuFood",
};

interface StatusDef {
  key: string;
  label: string;
}

const LISTING_STATUSES: StatusDef[] = [
  { key: "draft", label: "Draft" },
  { key: "available", label: "Available" },
  { key: "reserved", label: "Reserved" },
  { key: "collected", label: "Collected" },
  { key: "expired", label: "Expired" },
  { key: "cancelled", label: "Cancelled" },
];

const CLAIM_STATUSES: StatusDef[] = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "no_show", label: "No show" },
  { key: "expired", label: "Expired" },
];

/** Older payloads named two of these differently; both spellings count. */
function claimCount(claims: Record<string, number> | undefined, key: string) {
  if (!claims) return 0;
  if (key === "active") return claims.active ?? claims.accepted ?? 0;
  if (key === "no_show") return claims.no_show ?? claims.declined ?? 0;
  return claims[key] ?? 0;
}

function toSliceData(
  statuses: StatusDef[],
  read: (key: string) => number,
): DonutSlice[] {
  return statuses.map(({ key, label }) => ({ key, label, count: read(key) }));
}

function Notice({ title, children }: { title: string; children: string }) {
  return (
    <Card className="mx-auto w-full max-w-lg" data-animate="field">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{children}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function ReportsPage() {
  const session = await requireSession();

  let me: Me | null = null;
  if (session.idToken) {
    try {
      me = await getMe(session.idToken);
    } catch (err) {
      if (!(err instanceof ProfileApiError)) throw err;
    }
  }

  if (!me?.org || me.org.status !== "approved") {
    return (
      <PageShell>
        <AnimateIn>
          <Notice title="Reports unavailable">
            Reports open once your organisation is approved.
          </Notice>
        </AnimateIn>
      </PageShell>
    );
  }

  // Each card degrades to empty on its own; neither takes the page down.
  const [summaryResult, metricsResult, claimsResult] = await Promise.allSettled([
    getOrgSummary(session.idToken!),
    getRescuedMetrics(session.idToken!),
    // 100 is the endpoint's ceiling; the card states the sample it drew.
    listRequests(session.idToken!, {
      sortBy: "requestedAt",
      sortOrder: "desc",
      limit: 100,
    }),
  ]);

  const summary: OrgSummary | null =
    summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const metrics: RescuedMetrics | null =
    metricsResult.status === "fulfilled" ? metricsResult.value : null;

  const claimsPage =
    claimsResult.status === "fulfilled" ? claimsResult.value : null;
  const claims = claimsPage?.items ?? [];
  const trend = toTrend(claims);
  const performance = toPerformance(claims);

  const isRescuePartner = me.org.type === "rescue_partner";
  const listingSlices = toSliceData(
    LISTING_STATUSES,
    (key) => summary?.listings?.[key] ?? 0,
  );
  const claimSlices = toSliceData(CLAIM_STATUSES, (key) =>
    claimCount(summary?.claims, key),
  );

  return (
    <PageShell>
      <AnimateIn className="mb-8">
        <PageHeader
          title="Reports"
          subtitle={describeOrg(me)}
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Reports" },
          ]}
          action={<RefreshControl />}
        />
      </AnimateIn>

      <AnimateIn>
        <ReportKpis
          summary={summary}
          metrics={metrics}
          isRescuePartner={isRescuePartner}
        />
      </AnimateIn>

      <AnimateIn className="mt-6">
        <div className="grid gap-6">
          {/* One breakdown per role: a donor's lots, a partner's claims. */}
          {isRescuePartner ? (
            <StatusDonut
              title="Your claims"
              description="Where your claims stand."
              slices={claimSlices}
            />
          ) : (
            <StatusDonut
              title="Listings by status"
              description="Where your lots are."
              slices={listingSlices}
            />
          )}

          <ClaimsTrend
            points={trend}
            sampled={claimsPage?.items.length ?? 0}
            total={claimsPage?.total ?? 0}
          />

          <ListingPerformance rows={performance} sampled={claims.length} />
        </div>
      </AnimateIn>
    </PageShell>
  );
}
