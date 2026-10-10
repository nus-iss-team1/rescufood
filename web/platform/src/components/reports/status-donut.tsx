"use client";

import { Label, Pie, PieChart } from "recharts";

import {
  Card,
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

export interface DonutSlice {
  key: string;
  label: string;
  count: number;
}

/**
 * Four is the ceiling: past that no categorical palette keeps every pair
 * apart for colourblind readers, since a ring invites comparing any slice
 * with any other, not just its neighbours.
 */
const MAX_SLICES = 4;

const SWATCHES = [
  "var(--cat-1)",
  "var(--cat-2)",
  "var(--cat-3)",
  "var(--cat-4)",
] as const;

/** Biggest first, with the tail collapsed so the ring never exceeds four. */
export function toSlices(slices: DonutSlice[]): DonutSlice[] {
  const present = slices.filter((slice) => slice.count > 0);
  const ranked = [...present].sort((a, b) => b.count - a.count);
  if (ranked.length <= MAX_SLICES) return ranked;

  const head = ranked.slice(0, MAX_SLICES - 1);
  const tail = ranked.slice(MAX_SLICES - 1);
  return [
    ...head,
    {
      key: "other",
      label: `Other (${tail.length})`,
      count: tail.reduce((sum, slice) => sum + slice.count, 0),
    },
  ];
}

export function StatusDonut({
  title,
  description,
  slices,
}: {
  title: string;
  description: string;
  slices: DonutSlice[];
}) {
  const shown = toSlices(slices);
  const total = shown.reduce((sum, slice) => sum + slice.count, 0);

  const data = shown.map((slice, i) => ({
    ...slice,
    fill: SWATCHES[i],
    share: total === 0 ? 0 : Math.round((slice.count / total) * 100),
  }));

  const config: ChartConfig = Object.fromEntries(
    data.map((slice) => [slice.key, { label: slice.label, color: slice.fill }]),
  );

  return (
    <Card
      data-animate="field"
      // Two across on a phone leaves ~160px a card, so the inset shrinks.
      className="[--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]"
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
        ) : (
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:gap-6">
            <p className="sr-only">
              {`${title}: ${data
                .map((slice) => `${slice.label} ${slice.count} (${slice.share}%)`)
                .join(", ")}. Total ${total}.`}
            </p>
            <ChartContainer
              config={config}
              className="aspect-square h-[130px] shrink-0 sm:h-[170px] lg:h-[150px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent nameKey="key" hideLabel />}
                />
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="key"
                  innerRadius={46}
                  outerRadius={72}
                  // A 2px surface gap between fills, per the mark specs.
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {/* Each row carries its own fill, so no Cell children:
                      they would shadow the centre Label. */}
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox))
                        return null;
                      const cx = viewBox.cx ?? 0;
                      const cy = viewBox.cy ?? 0;
                      return (
                        <text
                          x={cx}
                          y={cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={cx}
                            y={cy - 4}
                            className="fill-foreground text-[22px] font-semibold tabular-nums"
                          >
                            {total}
                          </tspan>
                          <tspan
                            x={cx}
                            y={cy + 16}
                            className="fill-muted-foreground text-[11px]"
                          >
                            total
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Legend and direct labels in one: identity is never colour alone. */}
            {/* Too narrow for a legend beside the ring: hover or tap a
                slice instead. The sr-only summary above still carries it. */}
            <dl className="hidden w-full min-w-0 gap-1.5 lg:grid lg:flex-1">
              {data.map((slice) => (
                <div
                  key={slice.key}
                  className="flex items-center gap-2 text-xs sm:text-sm"
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: slice.fill }}
                  />
                  <dt className="min-w-0 flex-1 truncate text-muted-foreground">
                    {slice.label}
                  </dt>
                  <dd className="tabular-nums">
                    <span className="font-medium">{slice.count}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {slice.share}%
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
