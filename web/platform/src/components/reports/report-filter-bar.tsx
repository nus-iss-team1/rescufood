"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, Building2, Calendar, Filter, RotateCcw } from "lucide-react";

import { Button } from "@rescufood/ui/components/button";
import { Card } from "@rescufood/ui/components/card";
import { Input } from "@rescufood/ui/components/input";
import { Label } from "@rescufood/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rescufood/ui/components/select";

export interface ReportFilterBarProps {
  isAdmin: boolean;
  organisations?: Array<{ id: string; name: string }>;
  initialFilters: {
    from?: string;
    to?: string;
    orgId?: string;
  };
}

export function ReportFilterBar({
  isAdmin,
  organisations = [],
  initialFilters,
}: ReportFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [prevFilters, setPrevFilters] = useState(initialFilters);
  const [from, setFrom] = useState(initialFilters.from ?? "");
  const [to, setTo] = useState(initialFilters.to ?? "");
  const [orgId, setOrgId] = useState(initialFilters.orgId ?? "all");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state if initialFilters prop changes externally
  if (
    prevFilters.from !== initialFilters.from ||
    prevFilters.to !== initialFilters.to ||
    prevFilters.orgId !== initialFilters.orgId
  ) {
    setPrevFilters(initialFilters);
    setFrom(initialFilters.from ?? "");
    setTo(initialFilters.to ?? "");
    setOrgId(initialFilters.orgId ?? "all");
    setValidationError(null);
  }

  const orgOptions = [
    { value: "all", label: "All organisations" },
    ...organisations.map((o) => ({ value: o.id, label: o.name })),
  ];

  const orgItems: Record<string, string> = Object.fromEntries(
    orgOptions.map((opt) => [opt.value, opt.label]),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side date order validation
    if (from && to && from > to) {
      setValidationError("Start date cannot be after end date");
      return;
    }

    setValidationError(null);

    startTransition(() => {
      const params = new URLSearchParams();
      if (from.trim()) params.set("from", from.trim());
      if (to.trim()) params.set("to", to.trim());
      if (isAdmin && orgId && orgId !== "all") {
        params.set("orgId", orgId.trim());
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const handleReset = () => {
    setFrom("");
    setTo("");
    setOrgId("all");
    setValidationError(null);
    startTransition(() => {
      router.replace(pathname);
    });
  };

  const hasActiveFilters = Boolean(
    from ||
      to ||
      (isAdmin && orgId !== "all") ||
      initialFilters.from ||
      initialFilters.to ||
      (isAdmin && initialFilters.orgId && initialFilters.orgId !== "all"),
  );

  return (
    <Card className="p-4" data-animate="field">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          {/* Start Date */}
          <div className="flex flex-col gap-1.5 min-w-[140px] flex-1 sm:flex-initial">
            <Label
              htmlFor="report-from-date"
              className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
            >
              <Calendar className="size-3.5" aria-hidden="true" />
              From
            </Label>
            <Input
              id="report-from-date"
              name="from"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                if (validationError) setValidationError(null);
              }}
              disabled={isPending}
              className="h-9"
              aria-label="Filter from date"
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5 min-w-[140px] flex-1 sm:flex-initial">
            <Label
              htmlFor="report-to-date"
              className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
            >
              <Calendar className="size-3.5" aria-hidden="true" />
              To
            </Label>
            <Input
              id="report-to-date"
              name="to"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                if (validationError) setValidationError(null);
              }}
              disabled={isPending}
              className="h-9"
              aria-label="Filter to date"
            />
          </div>

          {/* Organisation Selector (Admins Only) */}
          {isAdmin && (
            <div className="flex flex-col gap-1.5 min-w-[200px] flex-1 sm:flex-initial">
              <Label
                htmlFor="report-org-select"
                className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
              >
                <Building2 className="size-3.5" aria-hidden="true" />
                Organisation
              </Label>
              <Select
                value={orgId}
                onValueChange={(val) => {
                  if (val) setOrgId(val);
                }}
                items={orgItems}
                disabled={isPending}
              >
                <SelectTrigger id="report-org-select" className="h-9 w-full">
                  <SelectValue placeholder="All organisations" />
                </SelectTrigger>
                <SelectContent>
                  {orgOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center gap-2 pt-1 sm:pt-0">
            <Button
              type="submit"
              size="sm"
              className="h-9"
              disabled={isPending}
            >
              <Filter className="size-3.5 mr-1.5" aria-hidden="true" />
              {isPending ? "Applying..." : "Apply"}
            </Button>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleReset}
                disabled={isPending}
              >
                <RotateCcw className="size-3.5 mr-1.5" aria-hidden="true" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Inline Validation Error */}
        {validationError && (
          <p
            role="alert"
            className="text-xs text-destructive font-medium flex items-center gap-1.5"
          >
            <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
            {validationError}
          </p>
        )}
      </form>
    </Card>
  );
}
