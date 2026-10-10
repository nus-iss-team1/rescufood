"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rescufood/ui/components/select";

export interface StatusOption {
  value: string;
  label: string;
  count: number;
}

/**
 * Status as a dropdown rather than a row of tabs: the lifecycle has too
 * many states to sit on one line. Navigates, so the status stays in the URL
 * and the page remains shareable.
 */
export function StatusFilter({
  options,
  active,
  view,
  basePath,
}: {
  options: StatusOption[];
  active: string;
  /** Preserved across a status change. */
  view: string;
  basePath: string;
}) {
  const router = useRouter();

  const change = (next: string | null) => {
    if (!next) return;
    const params = new URLSearchParams();
    if (next !== "all") params.set("status", next);
    if (view !== "list") params.set("view", view);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  const labels = Object.fromEntries(
    options.map((option) => [
      option.value,
      option.count > 0 ? `${option.label} (${option.count})` : option.label,
    ]),
  );

  return (
    <Select value={active} onValueChange={change} items={labels}>
      <SelectTrigger
        aria-label="Filter by status"
        className="w-[13rem] capitalize"
      >
        <SelectValue />
      </SelectTrigger>
      {/* alignItemWithTrigger defaults true, which lays the popup over the
          trigger with the selected row under the cursor. Drop it below. */}
      <SelectContent
        alignItemWithTrigger={false}
        align="start"
        sideOffset={6}
        className="min-w-[13rem] p-1"
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="gap-3 py-2 pl-2.5 capitalize"
          >
            <span className="flex-1">{option.label}</span>
            {option.count > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {option.count}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
