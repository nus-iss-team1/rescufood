"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, HeartHandshake, RefreshCw, Scale } from "lucide-react";

import type { RescuedMetrics } from "@/lib/listings";
import { getRescuedMetricsAction } from "@/app/dashboard/actions";
import { Badge } from "@rescufood/ui/components/badge";
import { Button } from "@rescufood/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { Skeleton } from "@rescufood/ui/components/skeleton";
import { toast } from "@rescufood/ui/components/sonner";
import { cn } from "@/lib/utils";

export function formatAsOf(dateOrIso?: string | Date | null): string {
  if (!dateOrIso) return "";
  const d = new Date(dateOrIso);
  if (Number.isNaN(d.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const getPart = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const day = getPart("day");
  const month = getPart("month").slice(0, 3);
  const year = getPart("year");
  const hour = getPart("hour");
  const minute = getPart("minute");

  return `${day} ${month} ${year}, ${hour}:${minute} SGT`;
}

export function RescuedMetricsSkeleton() {
  return (
    <Card className="w-full gap-3">
      <CardHeader className="pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3.5 w-72" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export interface RescuedMetricsCardProps {
  initialMetrics?: RescuedMetrics | null;
  initialError?: string | null;
  orgType?: "donor" | "rescue_partner";
}

export function RescuedMetricsCard({
  initialMetrics,
  initialError,
  orgType = "donor",
}: RescuedMetricsCardProps) {
  const router = useRouter();
  const isRescuePartner = orgType === "rescue_partner";

  const [metrics, setMetrics] = useState<RescuedMetrics | null>(
    initialMetrics ?? null,
  );
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await getRescuedMetricsAction();
      if (result.data) {
        setMetrics(result.data);
        setError(null);
        toast.success("Metrics updated", {
          description: "Latest rescue metrics loaded.",
        });
      } else if (result.error) {
        if (!metrics) {
          setError(result.error);
        }
        toast.error("Could not refresh metrics", {
          description: result.error,
        });
      }
    } catch (err) {
      const msg = (err as Error).message ?? "Network error";
      if (!metrics) {
        setError(msg);
      }
      toast.error("Could not refresh metrics", {
        description: msg,
      });
    } finally {
      setIsRefreshing(false);
      router.refresh();
    }
  };

  // Error state without prior data: display clean inline error banner with retry trigger
  if (error && !metrics) {
    return (
      <Card className="w-full gap-3">
        <CardHeader className="pb-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <HeartHandshake className="size-5 text-primary" />
                Rescued Quantity & Performance Metrics
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Aggregate rescued lot volume and time-to-claim analytics
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 gap-1.5 px-3 text-xs self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw
                className={cn("size-3.5", isRefreshing && "animate-spin")}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-5 text-center space-y-2.5">
            <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>Could not load rescued metrics</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {error}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 h-8 text-xs border-destructive/30 hover:bg-destructive/15 mt-1 cursor-pointer"
            >
              <RefreshCw
                className={cn("size-3.5", isRefreshing && "animate-spin")}
              />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Initial loading state
  if (!metrics) {
    return <RescuedMetricsSkeleton />;
  }

  const asOfFormatted = formatAsOf(metrics.asOf);
  const hasRescuedUnits = metrics.rescuedByUnit.length > 0;
  const hasTimeToClaim = metrics.timeToClaimCount > 0;

  return (
    <Card className="w-full gap-3">
      <CardHeader className="pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <HeartHandshake className="size-5 text-primary" />
              Rescued Quantity & Performance Metrics
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {asOfFormatted && (
                <span>
                  Updated as of:{" "}
                  <strong className="font-medium text-foreground">
                    {asOfFormatted}
                  </strong>
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 px-3 text-xs self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw
              className={cn("size-3.5", isRefreshing && "animate-spin")}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Card 1: Total Rescued Food */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/20">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Scale className="size-4" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Total Rescued Food
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Collected lot quantities
                    </p>
                  </div>
                </div>
                {metrics.lotsCollected > 0 && (
                  <Badge variant="success" className="text-[11px] font-medium h-5">
                    {metrics.lotsCollected}{" "}
                    {metrics.lotsCollected === 1 ? "lot" : "lots"} collected
                  </Badge>
                )}
              </div>

              {/* Multi-unit display: distinctly grouped by unit, never summed across incompatible types */}
              <div className="mt-4">
                {hasRescuedUnits ? (
                  <div className="flex flex-wrap items-baseline gap-2">
                    {metrics.rescuedByUnit.map((item) => (
                      <div
                        key={item.unit}
                        className="inline-flex items-baseline gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5"
                      >
                        <span className="text-2xl font-bold tracking-tight text-foreground">
                          {item.formattedAmount}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {item.unit}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          · {item.lots} {item.lots === 1 ? "lot" : "lots"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-muted-foreground">
                      0
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (No completed rescue outcomes yet)
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground">
              {isRescuePartner
                ? "Quantities collected by your rescue team."
                : "Surplus collected and distributed from your published listings."}
            </p>
          </div>

          {/* Card 2: Average Time-to-Claim */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/20">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Clock className="size-4" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Average Time-to-Claim
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Publication to confirmed claim
                    </p>
                  </div>
                </div>
                {hasTimeToClaim && (
                  <Badge variant="outline" className="text-[11px] font-medium h-5">
                    {metrics.timeToClaimCount}{" "}
                    {metrics.timeToClaimCount === 1 ? "claim" : "claims"}
                  </Badge>
                )}
              </div>

              <div className="mt-4">
                {hasTimeToClaim ? (
                  <div className="space-y-1">
                    <div className="text-2xl font-bold tracking-tight text-foreground">
                      {metrics.formattedAvgTimeToClaim}
                    </div>
                    {metrics.formattedMedianTimeToClaim !== "--" && (
                      <div className="text-xs text-muted-foreground">
                        Median time:{" "}
                        <strong className="font-medium text-foreground">
                          {metrics.formattedMedianTimeToClaim}
                        </strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-muted-foreground">
                      --
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (No qualifying claim records yet)
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground">
              {isRescuePartner
                ? "Turnaround speed from listing publication to your claims."
                : "Speed with which rescue partners reserve your surplus lots."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
