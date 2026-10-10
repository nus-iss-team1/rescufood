import Link from "next/link";
import type { OrgSummary, RescuedMetrics } from "@rescufood/listings-sdk";

import { cn } from "@/lib/utils";

function Kpi({
  value,
  suffix,
  label,
  href,
  hint,
}: {
  value: string;
  suffix?: string;
  label: string;
  href: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-1 rounded-xl border border-border bg-card p-4",
        "transition-colors hover:border-foreground/20 hover:bg-muted/30",
      )}
    >
      <span className="flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight tabular-nums">
          {value}
        </span>
        {suffix && (
          <span className="text-sm font-medium text-muted-foreground">
            {suffix}
          </span>
        )}
      </span>
      <span className="text-sm font-medium group-hover:underline">{label}</span>
      {hint && (
        <span className="text-xs text-muted-foreground">{hint}</span>
      )}
    </Link>
  );
}

/** The primary unit's rescued total; units are never summed together. */
function rescued(metrics: RescuedMetrics | null) {
  const top = metrics?.rescuedByUnit?.[0];
  if (!top) return { value: "0", suffix: undefined, hint: undefined };
  const others = (metrics?.rescuedByUnit.length ?? 0) - 1;
  return {
    value: top.formattedAmount,
    suffix: top.unit,
    hint: others > 0 ? `+ ${others} more unit${others > 1 ? "s" : ""}` : undefined,
  };
}

/** The four counts a donor acts on, in lifecycle order. */
export function DonorKpis({
  summary,
  metrics,
}: {
  summary: OrgSummary | null;
  metrics: RescuedMetrics | null;
}) {
  const count = (key: string) => String(summary?.listings?.[key] ?? 0);
  const rescue = rescued(metrics);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi
        value={count("available")}
        label="Available now"
        href="/listings?status=available"
      />
      <Kpi
        value={count("reserved")}
        label="Awaiting pickup"
        href="/listings?status=reserved"
      />
      <Kpi
        value={count("collected")}
        label="Collected"
        href="/listings?status=collected"
      />
      <Kpi
        value={rescue.value}
        suffix={rescue.suffix}
        label="Rescued"
        hint={rescue.hint}
        href="/reports"
      />
    </div>
  );
}
