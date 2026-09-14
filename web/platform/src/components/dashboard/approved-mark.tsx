"use client";

import { BadgeCheck } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rescufood/ui/components/tooltip";

/**
 * Approval shown as a mark rather than a badge. The label is on the
 * element itself, so it survives touch and screen readers, where a
 * tooltip alone would not.
 */
export function ApprovedMark() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            aria-label="Approved by a platform administrator"
            className="inline-flex text-success"
          >
            <BadgeCheck className="size-5" aria-hidden />
          </span>
        }
      />
      <TooltipContent>Approved by a platform administrator</TooltipContent>
    </Tooltip>
  );
}
