import type { Metadata } from "next";

import { requireSession } from "@/lib/session";
import { getMe, ProfileApiError, type Me } from "@/lib/profile";
import { AnimateIn } from "@/components/animate-in";
import { PageHeader, describeOrg } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { OrgSummaryCard } from "@/components/dashboard/org-summary-card";
import { RescuedMetricsCard } from "@/components/dashboard/rescued-metrics-card";
import {
  getOrgSummary,
  getRescuedMetrics,
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
  let summary: OrgSummary | null = null;
  let summaryError: string | null = null;
  let metrics: RescuedMetrics | null = null;
  let metricsError: string | null = null;

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

  const [summaryResult, metricsResult] = await Promise.allSettled([
    getOrgSummary(session.idToken!),
    getRescuedMetrics(session.idToken!),
  ]);

  if (summaryResult.status === "fulfilled") summary = summaryResult.value;
  else summaryError = (summaryResult.reason as Error).message;

  if (metricsResult.status === "fulfilled") metrics = metricsResult.value;
  else metricsError = (metricsResult.reason as Error).message;

  return (
    <PageShell>
      <AnimateIn className="mb-8">
        <PageHeader
          title="Reports"
          subtitle={describeOrg(me)}
          crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }]}
        />
      </AnimateIn>

      <AnimateIn>
        <OrgSummaryCard
          initialSummary={summary}
          initialError={summaryError}
          orgType={me.org.type}
        />
      </AnimateIn>

      <AnimateIn className="mt-6">
        <RescuedMetricsCard
          initialMetrics={metrics}
          initialError={metricsError}
          orgType={me.org.type}
        />
      </AnimateIn>
    </PageShell>
  );
}
