"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { ListingPerformanceRow } from "@/lib/listing-performance";
import { Button } from "@rescufood/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rescufood/ui/components/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rescufood/ui/components/table";

const PAGE_SIZES = [5, 10, 20, 50] as const;

/** Trims a summed decimal without leaving "12.00". */
function amount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function ListingPerformance({
  rows,
  sampled,
}: {
  rows: ListingPerformanceRow[];
  /** How many claims these rows were derived from. */
  sampled: number;
}) {
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  // A shrinking row set can strand the cursor past the last page.
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const shown = rows.slice(start, start + pageSize);

  // The select clears to null on dismissal; keep the current size then.
  const resize = (next: string | null) => {
    if (!next) return;
    setPageSize(Number(next));
    setPage(1);
  };

  return (
    <Card data-animate="field">
      <CardHeader>
        <CardTitle>Listing performance</CardTitle>
        <CardDescription>
          Which lots get claimed, from your last {sampled}.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {shown.length === 0 ? (
          <p className="px-(--card-spacing) text-sm text-muted-foreground">
            No claims recorded yet.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-full pl-(--card-spacing)">
                    Listing
                  </TableHead>
                  <TableHead className="text-right">Claims</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">No-show</TableHead>
                  <TableHead className="pr-(--card-spacing) text-right">
                    Collected
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((row) => (
                  <TableRow key={row.listingId} className="last:border-0">
                    {/* max-w-0 lets truncate work inside an auto-width table. */}
                    <TableCell className="max-w-0 truncate pl-(--card-spacing) font-medium">
                      <Link
                        href={`/listings/${row.listingId}`}
                        prefetch={false}
                        className="underline-offset-4 hover:underline"
                      >
                        {row.description}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.claims}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.completed}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.noShow || "—"}
                    </TableCell>
                    <TableCell className="pr-(--card-spacing) text-right tabular-nums">
                      {row.collected === null ? (
                        "—"
                      ) : (
                        <>
                          {amount(row.collected)}
                          {row.unit && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {row.unit}
                            </span>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-3 px-(--card-spacing) pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Rows per page</span>
                <Select value={String(pageSize)} onValueChange={resize}>
                  <SelectTrigger
                    aria-label="Rows per page"
                    className="h-7 w-[4.5rem] text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {start + 1}–{start + shown.length} of {rows.length}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="size-7 rounded-md p-0"
                  aria-label="Previous page"
                  disabled={current <= 1}
                  onClick={() => setPage(current - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="size-7 rounded-md p-0"
                  aria-label="Next page"
                  disabled={current >= pages}
                  onClick={() => setPage(current + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
