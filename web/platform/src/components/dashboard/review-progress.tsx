import { Check } from "lucide-react";

import type { Org } from "@/lib/profile";
import { cn } from "@/lib/utils";

const steps = ["Submitted", "Under review", "Approved"] as const;

export function ReviewProgress({ org }: { org: Org }) {
  // Registration is step 1; approval is the last step.
  const current = 1;

  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                done && "border-foreground bg-foreground text-background",
                active && "border-foreground",
                !done && !active && "border-border text-muted-foreground"
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                active ? "font-medium" : "text-muted-foreground"
              )}
            >
              {step}
            </span>
            {i < steps.length - 1 && (
              <span className="hidden h-px flex-1 bg-border sm:block" />
            )}
          </li>
        );
      })}
      <span className="sr-only">
        {org.name} is at step {current + 1} of {steps.length}
      </span>
    </ol>
  );
}
