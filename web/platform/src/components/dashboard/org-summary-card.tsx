"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BarChart3, RefreshCw } from "lucide-react";

import type { OrgSummary } from "@/lib/listings";
import { getOrgSummaryAction } from "@/app/dashboard/actions";
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

const LISTING_STATUSES: {
  key: string;
  label: string;
  variant: "outline" | "success" | "info" | "secondary" | "destructive";
}[] = [
  { key: "draft", label: "Draft", variant: "outline" },
  { key: "available", label: "Available", variant: "success" },
  { key: "reserved", label: "Reserved", variant: "info" },
  { key: "collected", label: "Collected", variant: "secondary" },
  { key: "expired", label: "Expired", variant: "destructive" },
  { key: "cancelled", label: "Cancelled", variant: "outline" },
];

const CLAIM_STATUSES: {
  key: string;
  label: string;
  variant: "info" | "success" | "destructive" | "outline" | "secondary";
}[] = [
  { key: "active", label: "Active", variant: "info" },
  { key: "completed", label: "Completed", variant: "success" },
  { key: "cancelled", label: "Cancelled", variant: "outline" },
  { key: "no_show", label: "No show", variant: "destructive" },
  { key: "expired", label: "Expired", variant: "outline" },
];

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

function formatPeriod(
  period?: { from?: string | Date; to?: string | Date } | null,
): string | null {
  if (!period || (!period.from && !period.to)) return null;
  const fromStr = period.from ? formatAsOf(period.from) : null;
  const toStr = period.to ? formatAsOf(period.to) : null;
  if (fromStr && toStr) return `Period: ${fromStr} – ${toStr}`;
  if (fromStr) return `Period from: ${fromStr}`;
  if (toStr) return `Period until: ${toStr}`;
  return null;
}

function getListingCount(
  listings: Record<string, number> | undefined,
  key: string,
): number {
  if (!listings) return 0;
  return listings[key] ?? 0;
}

function getClaimCount(
  claims: Record<string, number> | undefined,
  key: string,
): number {
  if (!claims) return 0;
  if (key === "active") return claims.active ?? claims.accepted ?? 0;
  if (key === "completed") return claims.completed ?? 0;
  if (key === "cancelled") return claims.cancelled ?? 0;
  if (key === "no_show") return claims.no_show ?? claims.declined ?? 0;
  if (key === "expired") return claims.expired ?? 0;
  return claims[key] ?? 0;
}

export function OrgSummarySkeleton({
  orgType = "donor",
}: {
  orgType?: "donor" | "rescue_partner";
} = {}) {
  const isRescuePartner = orgType === "rescue_partner";

  return (
    <Card className="w-full gap-3">
      <CardHeader className="pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-3.5 w-64" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isRescuePartner && (
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-44" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-3 space-y-2"
                >
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-7 w-8" />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-44" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-3 space-y-2"
              >
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-7 w-8" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export interface OrgSummaryCardProps {
  initialSummary?: OrgSummary | null;
  initialError?: string | null;
  orgType?: "donor" | "rescue_partner";
}

export function OrgSummaryCard({
  initialSummary,
  initialError,
  orgType = "donor",
}: OrgSummaryCardProps) {
  const router = useRouter();
  const isRescuePartner = orgType === "rescue_partner";
  const [summary, setSummary] = useState<OrgSummary | null>(
    initialSummary ?? null,
  );
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await getOrgSummaryAction();
      if (result.data) {
        setSummary(result.data);
        setError(null);
        toast.success("Summary updated", {
          description: "Latest operational counts loaded.",
        });
      } else if (result.error) {
        if (!summary) {
          setError(result.error);
        }
        toast.error("Could not refresh summary", {
          description: result.error,
        });
      }
    } catch (err) {
      const msg = (err as Error).message ?? "Network error";
      if (!summary) {
        setError(msg);
      }
      toast.error("Could not refresh summary", {
        description: msg,
      });
    } finally {
      setIsRefreshing(false);
      router.refresh();
    }
  };

  // If there's an error and no previous summary, do not show stale/misleading counts
  if (error && !summary) {
    return (
      <Card className="w-full gap-3">
        <CardHeader className="pb-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="size-5 text-primary" />
                {isRescuePartner
                  ? "Claim Activity Summary"
                  : "Organisation Workload Summary"}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {isRescuePartner
                  ? "Aggregate claim counts by lifecycle status"
                  : "Aggregate listing and claim counts by lifecycle status"}
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
              <span>Could not load organisation summary</span>
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

  // If initial fetch hasn't resolved yet
  if (!summary) {
    return <OrgSummarySkeleton orgType={orgType} />;
  }

  const asOfFormatted = formatAsOf(summary.asOf);
  const periodFormatted = formatPeriod(summary.period);

  const listingTotal =
    summary.listings?.total ??
    LISTING_STATUSES.reduce(
      (acc, s) => acc + getListingCount(summary.listings, s.key),
      0,
    );

  const claimTotal =
    summary.claims?.total ??
    CLAIM_STATUSES.reduce(
      (acc, s) => acc + getClaimCount(summary.claims, s.key),
      0,
    );

  return (
    <Card className="w-full gap-3">
      <CardHeader className="pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              {isRescuePartner
                ? "Claim Activity Summary"
                : "Organisation Workload Summary"}
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
              {periodFormatted && (
                <>
                  <span aria-hidden className="text-border">
                    |
                  </span>
                  <span>{periodFormatted}</span>
                </>
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
        {/* Listings Breakdown Section (donors only) */}
        {!isRescuePartner && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-sm font-semibold text-foreground">
                Listings by Lifecycle Status
              </h3>
              <span className="text-xs text-muted-foreground">
                Total listings:{" "}
                <strong className="font-semibold text-foreground">
                  {listingTotal}
                </strong>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {LISTING_STATUSES.map(({ key, label, variant }) => {
                const count = getListingCount(summary.listings, key);
                return (
                  <div
                    key={key}
                    className="flex flex-col justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={variant}
                        className="capitalize text-[11px] font-medium px-2 py-0 h-5"
                      >
                        {label}
                      </Badge>
                    </div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Claims/Requests Breakdown Section */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-semibold text-foreground">
              {isRescuePartner
                ? "Your Claims by Lifecycle Status"
                : "Claims on Your Listings by Lifecycle Status"}
            </h3>
            <span className="text-xs text-muted-foreground">
              {isRescuePartner ? "Total claims filed: " : "Total claims: "}
              <strong className="font-semibold text-foreground">
                {claimTotal}
              </strong>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {CLAIM_STATUSES.map(({ key, label, variant }) => {
              const count = getClaimCount(summary.claims, key);
              return (
                <div
                  key={key}
                  className="flex flex-col justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={variant}
                      className="capitalize text-[11px] font-medium px-2 py-0 h-5"
                    >
                      {label}
                    </Badge>
                  </div>
                  <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
