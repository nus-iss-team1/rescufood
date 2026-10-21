import type { Metadata } from "next";

import { requireSession } from "@/lib/session";
import { getMe, listOrgs, ProfileApiError, type Me, type Org } from "@/lib/profile";
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
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import {
  getOrgSummary,
  getRescuedMetrics,
  listRequests,
  ListingsApiError,
  type OrgSummary,
  type RescuedMetrics,
  type StatsFilters,
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

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; orgId?: string }>;
}) {
  const session = await requireSession();

  let me: Me | null = null;
  if (session.idToken) {
    try {
      me = await getMe(session.idToken);
    } catch (err) {
      if (!(err instanceof ProfileApiError)) throw err;
    }
  }

  if (!me) {
    return (
      <PageShell>
        <AnimateIn>
          <Notice title="Reports unavailable">
            Could not verify your profile. Please sign in again.
          </Notice>
        </AnimateIn>
      </PageShell>
    );
  }

  // Non-admins must belong to an approved organization to view reports.
  // Platform admins are permitted without belonging to a donor/rescue org.
  if (!me.is_admin && (!me.org || me.org.status !== "approved")) {
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

  const { from: fromRaw, to: toRaw, orgId: orgIdRaw } = await searchParams;
  const isAdmin = Boolean(me.is_admin);

  let approvedOrgs: Org[] = [];
  if (isAdmin && session.idToken) {
    try {
      approvedOrgs = await listOrgs(session.idToken, "approved");
    } catch {
      approvedOrgs = [];
    }
  }

  // Resolve search parameters and sanitize permissions
  let sanitizedOrgId: string | undefined = undefined;
  if (isAdmin) {
    if (orgIdRaw && orgIdRaw !== "all") {
      sanitizedOrgId = orgIdRaw;
    }
  } else {
    // Non-admin always scopes to their own organisation
    sanitizedOrgId = me.org?.id;
  }

  const sanitizedFilters: StatsFilters = {
    ...(fromRaw?.trim() ? { from: fromRaw.trim() } : {}),
    ...(toRaw?.trim() ? { to: toRaw.trim() } : {}),
    ...(sanitizedOrgId ? { orgId: sanitizedOrgId } : {}),
  };

  // Determine selected organization info for header subtitle and role logic
  const selectedOrg = approvedOrgs.find((o) => o.id === sanitizedOrgId);
  const isRescuePartner = selectedOrg
    ? selectedOrg.type === "rescue_partner"
    : me.org?.type === "rescue_partner";

  const subtitle = selectedOrg
    ? `${selectedOrg.name} · ${selectedOrg.type === "donor" ? "Food donor" : "Rescue partner"}`
    : describeOrg(me);

  // Each call is settled; stats error renders an error/access-denied banner without crashing or showing partial numbers.
  const [summaryResult, metricsResult, claimsResult] = await Promise.allSettled([
    getOrgSummary(session.idToken!, sanitizedFilters),
    getRescuedMetrics(session.idToken!, sanitizedFilters),
    // 100 is the endpoint's ceiling; the card states the sample it drew.
    listRequests(session.idToken!, {
      sortBy: "requestedAt",
      sortOrder: "desc",
      limit: 100,
    }),
  ]);

  let summary: OrgSummary | null = null;
  let metrics: RescuedMetrics | null = null;
  let statsError: { status?: number; message: string } | null = null;

  if (summaryResult.status === "rejected") {
    const reason = summaryResult.reason;
    if (reason instanceof ListingsApiError) {
      statsError = { status: reason.status, message: reason.message };
    } else {
      statsError = {
        message:
          reason instanceof Error ? reason.message : "Failed to load report summary",
      };
    }
  } else {
    summary = summaryResult.value;
  }

  if (!statsError && metricsResult.status === "rejected") {
    const reason = metricsResult.reason;
    if (reason instanceof ListingsApiError) {
      statsError = { status: reason.status, message: reason.message };
    } else {
      statsError = {
        message:
          reason instanceof Error ? reason.message : "Failed to load rescued metrics",
      };
    }
  } else if (metricsResult.status === "fulfilled") {
    metrics = metricsResult.value;
  }

  const claimsPage =
    claimsResult.status === "fulfilled" ? claimsResult.value : null;
  const claims = claimsPage?.items ?? [];
  const trend = toTrend(claims);
  const performance = toPerformance(claims);

  const listingSlices = toSliceData(
    LISTING_STATUSES,
    (key) => summary?.listings?.[key] ?? 0,
  );
  const claimSlices = toSliceData(CLAIM_STATUSES, (key) =>
    claimCount(summary?.claims, key),
  );

  return (
    <PageShell>
      <AnimateIn className="mb-6">
        <PageHeader
          title="Reports"
          subtitle={subtitle}
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Reports" },
          ]}
          action={<RefreshControl />}
        />
      </AnimateIn>

      <AnimateIn className="mb-6">
        <ReportFilterBar
          isAdmin={isAdmin}
          organisations={approvedOrgs}
          initialFilters={{
            from: fromRaw,
            to: toRaw,
            orgId: orgIdRaw,
          }}
        />
      </AnimateIn>

      {statsError ? (
        <AnimateIn>
          <div
            data-animate="field"
            className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center"
          >
            <h3 className="text-base font-semibold text-destructive">
              {statsError.status === 403
                ? "Access Denied"
                : statsError.status === 404
                  ? "Organisation Not Found"
                  : isAdmin && !sanitizedOrgId
                    ? "Organisation Required"
                    : "Statistics Unavailable"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin && !sanitizedOrgId
                ? "Please select an organisation from the filter bar above to view its reports."
                : statsError.message ||
                  "Could not retrieve statistics for the selected filters."}
            </p>
          </div>
        </AnimateIn>
      ) : (
        <>
          <AnimateIn>
            <ReportKpis
              summary={summary}
              metrics={metrics}
              isRescuePartner={isRescuePartner}
            />
          </AnimateIn>

          <AnimateIn className="mt-6">
            <div className="grid gap-6">
              {/* A partner's listing counts are always zero. */}
              {isRescuePartner ? (
                <StatusDonut
                  title="Your claims"
                  description="Where your claims stand."
                  slices={claimSlices}
                />
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <StatusDonut
                    title="Listings by status"
                    description="Where your lots are."
                    slices={listingSlices}
                  />
                  <StatusDonut
                    title="Claims by status"
                    description="Where claims on your lots stand."
                    slices={claimSlices}
                  />
                </div>
              )}

              <ClaimsTrend
                points={trend}
                sampled={claimsPage?.items.length ?? 0}
                total={claimsPage?.total ?? 0}
              />

              <ListingPerformance rows={performance} sampled={claims.length} />
            </div>
          </AnimateIn>
        </>
      )}
    </PageShell>
  );
}
