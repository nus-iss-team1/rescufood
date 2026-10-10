import type { OrgSummary, RescuedMetrics } from "@rescufood/listings-sdk";

import { KpiCard } from "@/components/dashboard/kpi-card";

/** The primary unit's rescued total; units are never summed together. */
function rescued(metrics: RescuedMetrics | null) {
  const top = metrics?.rescuedByUnit?.[0];
  const others = (metrics?.rescuedByUnit?.length ?? 0) - 1;
  return {
    value: top?.formattedAmount ?? "0",
    suffix: top?.unit,
    caption:
      others > 0
        ? `+${others} more unit${others > 1 ? "s" : ""}`
        : "Across all collected lots",
  };
}

/**
 * The four counts a donor acts on, in lifecycle order. Badges carry counts
 * the API already reports; none of them is a trend.
 */
export function DonorKpis({
  summary,
  metrics,
  awaitingVerification,
}: {
  summary: OrgSummary | null;
  metrics: RescuedMetrics | null;
  awaitingVerification: number;
}) {
  const count = (key: string) => String(summary?.listings?.[key] ?? 0);
  const rescue = rescued(metrics);

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4">
      <KpiCard
        label="Available"
        value={count("available")}
        footer="View listings"
        caption="Ready for partners to claim"
        href="/listings?status=available"
      />
      <KpiCard
        label="Awaiting pickup"
        value={count("reserved")}
        badge={
          awaitingVerification > 0
            ? `${awaitingVerification} to verify`
            : undefined
        }
        badgeTone="info"
        footer="Claimed lots"
        caption="Awaiting collection"
        href="/listings?status=reserved"
      />
      <KpiCard
        label="Collected"
        value={count("collected")}
        footer="Completed pickups"
        caption="Handed over to a partner"
        href="/listings?status=collected"
      />
      <KpiCard
        label="Rescued"
        value={rescue.value}
        suffix={rescue.suffix}
        footer="Rescue impact"
        caption={rescue.caption}
        href="/reports"
      />
    </div>
  );
}

