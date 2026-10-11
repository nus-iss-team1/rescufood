import { Leaf } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The RescuFood wordmark, set in Outfit with a leaf above its right edge.
 * The right padding reserves the leaf's column.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-block pr-3.5 font-logo text-lg leading-none font-bold tracking-tight",
        className,
      )}
    >
      Rescu<span className="font-semibold text-primary">Food</span>
      <Leaf
        aria-hidden
        className="absolute -top-1 right-0 size-3.5 rotate-[18deg] text-primary"
      />
    </span>
  );
}
