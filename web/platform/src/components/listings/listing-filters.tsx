"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  CalendarClock,
  Layers,
  MapPin,
  Package,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { listingCategories } from "@rescufood/listings-sdk";
import { categoryLabels } from "@/lib/listing-labels";
import { isFilterActive } from "@/lib/filter-listings";
import { Input } from "@rescufood/ui/components/input";
import { Button } from "@rescufood/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rescufood/ui/components/select";
import { cn } from "@/lib/utils";

const windowOptions = [
  { value: "all", label: "All pickup times" },
  { value: "today", label: "Available Today" },
  { value: "24h", label: "Next 24 Hours" },
  { value: "48h", label: "Next 48 Hours" },
] as const;

export function ListingFilters({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read URL params
  const areaParam = searchParams.get("area") ?? "";
  const categoryParam = searchParams.get("category") ?? "all";
  const minQtyParam = searchParams.get("minQty") ?? "";
  const pickupWindowParam = searchParams.get("pickupWindow") ?? "all";

  // Local state for debounced inputs
  const [prevAreaParam, setPrevAreaParam] = useState(areaParam);
  const [areaInput, setAreaInput] = useState(areaParam);

  if (prevAreaParam !== areaParam) {
    setPrevAreaParam(areaParam);
    setAreaInput(areaParam);
  }

  const [prevMinQtyParam, setPrevMinQtyParam] = useState(minQtyParam);
  const [minQtyInput, setMinQtyInput] = useState(minQtyParam);

  if (prevMinQtyParam !== minQtyParam) {
    setPrevMinQtyParam(minQtyParam);
    setMinQtyInput(minQtyParam);
  }

  // Helper to commit changes to URL search params non-blockingly while preserving scroll
  const commitParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(updates)) {
          if (
            value === null ||
            value === undefined ||
            value === "" ||
            value === "all"
          ) {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        const qs = next.toString();
        const target = qs ? `${pathname}?${qs}` : pathname;
        router.replace(target, { scroll: false });
      });
    },
    [searchParams, pathname, router],
  );

  // Debounce Area search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (areaInput !== areaParam) {
        commitParams({ area: areaInput.trim() });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [areaInput, areaParam, commitParams]);

  // Debounce Min Quantity input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (minQtyInput !== minQtyParam) {
        commitParams({
          minQty: minQtyInput ? String(Math.max(1, Number(minQtyInput))) : "",
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [minQtyInput, minQtyParam, commitParams]);

  // Handle Category selection
  const handleCategoryChange = (val: string | null) => {
    commitParams({ category: val ?? "all" });
  };

  // Handle Pickup Window selection
  const handleWindowChange = (val: string | null) => {
    commitParams({ pickupWindow: val ?? "all" });
  };

  // Handle Reset All Filters
  const handleReset = () => {
    setAreaInput("");
    setMinQtyInput("");
    commitParams({
      area: null,
      category: null,
      minQty: null,
      pickupWindow: null,
      pickupBefore: null,
    });
  };

  const hasActiveFilters = isFilterActive({
    area: areaParam,
    category: categoryParam,
    minQty: minQtyParam,
    pickupWindow: pickupWindowParam,
    pickupBefore: searchParams.get("pickupBefore") ?? undefined,
  });

  return (
    <div
      data-animate="field"
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-xs md:p-4",
        className,
      )}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Pickup Area Search */}
        <div className="relative flex items-center">
          <MapPin
            className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder="Search pickup area..."
            value={areaInput}
            onChange={(e) => setAreaInput(e.target.value)}
            className="pl-9 pr-8"
            aria-label="Filter by pickup area"
          />
          {areaInput && (
            <button
              type="button"
              onClick={() => {
                setAreaInput("");
                commitParams({ area: "" });
              }}
              className="absolute right-2.5 flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-hidden"
              aria-label="Clear area filter"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* 2. Category Dropdown */}
        <div>
          <Select
            value={categoryParam}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger
              className="w-full justify-between"
              aria-label="Filter by category"
            >
              <div className="flex items-center gap-2 truncate">
                <Layers className="size-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="All Categories" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {listingCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryLabels[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 3. Minimum Quantity */}
        <div className="relative flex items-center">
          <Package
            className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="number"
            min="1"
            placeholder="Min quantity"
            value={minQtyInput}
            onChange={(e) => setMinQtyInput(e.target.value)}
            className="pl-9 pr-8"
            aria-label="Filter by minimum quantity"
          />
          {minQtyInput && (
            <button
              type="button"
              onClick={() => {
                setMinQtyInput("");
                commitParams({ minQty: "" });
              }}
              className="absolute right-2.5 flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-hidden"
              aria-label="Clear quantity filter"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* 4. Pickup Window Preset Selector */}
        <div>
          <Select
            value={pickupWindowParam}
            onValueChange={handleWindowChange}
          >
            <SelectTrigger
              className="w-full justify-between"
              aria-label="Filter by pickup window"
            >
              <div className="flex items-center gap-2 truncate">
                <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="All pickup times" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {windowOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 5. Active Filters / Reset Toolbar */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium">
            <Search className="size-3.5" />
            Filtered results
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isPending}
            className="h-7 rounded-full px-2.5 text-xs text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="mr-1 size-3" />
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
