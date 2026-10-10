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

/** The four headline figures, in the dashboard's card shape. */
export function ReportKpis({
  summary,
  metrics,
  isRescuePartner,
}: {
  summary: OrgSummary | null;
  metrics: RescuedMetrics | null;
  isRescuePartner: boolean;
}) {
  const rescue = rescued(metrics);

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4">
      {isRescuePartner ? (
        <KpiCard
          label="Claims filed"
          value={String(summary?.claims?.total ?? 0)}
          footer="Your claims"
          caption="Every claim your organisation filed"
          href="/requests"
        />
      ) : (
        <KpiCard
          label="Listings"
          value={String(summary?.listings?.total ?? 0)}
          footer="Your listings"
          caption="Every lot your organisation posted"
          href="/listings"
        />
      )}
      <KpiCard
        label={isRescuePartner ? "Completed" : "Claims"}
        value={String(summary?.claims?.total ?? 0)}
        footer="Claim activity"
        caption={
          isRescuePartner
            ? "Claims across every status"
            : "Claims made on your listings"
        }
        href="/requests"
      />
      <KpiCard
        label="Lots collected"
        value={String(metrics?.lotsCollected ?? 0)}
        footer="Completed pickups"
        caption="Handed over and verified"
        href="/requests?status=completed"
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
