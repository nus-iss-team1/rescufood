"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { TrendPoint } from "@/lib/claims-trend";
import { Button } from "@rescufood/ui/components/button";
import { cn } from "@/lib/utils";
import { segmentedItem, segmentedTrack } from "@/lib/segmented";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  count: { label: "Claims", color: "var(--chart-1)" },
} satisfies ChartConfig;

const dayLabel = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
});

function formatDay(day: string): string {
  return dayLabel.format(new Date(`${day}T00:00:00Z`));
}

const RANGES = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "3 months", days: 90 },
  { key: "all", label: "All", days: Number.POSITIVE_INFINITY },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

/** The last `days` of the series, counted back from its most recent day. */
function withinRange(points: TrendPoint[], days: number): TrendPoint[] {
  if (!Number.isFinite(days) || points.length === 0) return points;
  const last = new Date(`${points[points.length - 1].day}T00:00:00Z`);
  const from = new Date(last);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  const fromKey = from.toISOString().slice(0, 10);
  return points.filter((point) => point.day >= fromKey);
}

/**
 * The claim rate over the span the most recent claims cover. One series, so
 * no legend: the title names it.
 */
export function ClaimsTrend({
  points,
  sampled,
  total,
}: {
  points: TrendPoint[];
  /** How many claims the line was built from. */
  sampled: number;
  /** How many exist in all, so a capped sample is stated, not implied. */
  total: number;
}) {
  const [range, setRange] = useState<RangeKey>("all");
  const days = RANGES.find((r) => r.key === range)?.days ?? Infinity;
  const shown = withinRange(points, days);

  const peak = Math.max(...shown.map((p) => p.count), 1);

  return (
    <Card data-animate="field">
      <CardHeader>
        <CardTitle>Claim rate</CardTitle>
        <CardDescription>
          Your last {sampled}{total > sampled ? ` of ${total}` : ""} claims,
          day by day.
        </CardDescription>
        <CardAction>
          <div className={segmentedTrack}>
            {RANGES.map((option) => {
              const selected = range === option.key;
              return (
                <Button
                  key={option.key}
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-pressed={selected}
                  onClick={() => setRange(option.key)}
                  className={cn(
                    "h-7 px-2.5 text-xs font-medium",
                    segmentedItem(selected),
                  )}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {shown.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            {points.length === 0
              ? "No claims recorded yet."
              : "Not enough days in this range; try a wider one."}
          </p>
        ) : (
          <>
            <ChartContainer config={config} className="h-[180px] w-full">
              <AreaChart
                data={shown}
                margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="claims-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-count)"
                      stopOpacity={0.32}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-count)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                {/* Horizontal rules only: vertical ones would fight the line. */}
                <CartesianGrid vertical={false} />
                <YAxis
                  width={28}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  allowDecimals={false}
                  domain={[0, Math.max(peak, 1)]}
                  tick={{ fontSize: 11 }}
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  tickFormatter={formatDay}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(l) => formatDay(String(l))}
                    />
                  }
                />
                <Area
                  dataKey="count"
                  // Monotone is shape-preserving: smoothing cannot invent a
                  // peak or a dip below zero that the counts never had.
                  type="monotone"
                  stroke="var(--color-count)"
                  strokeWidth={2}
                  fill="url(#claims-fill)"
                />
              </AreaChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
