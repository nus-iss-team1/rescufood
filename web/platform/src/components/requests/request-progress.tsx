"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Check, X } from "lucide-react";

import type { ListingRequest } from "@rescufood/listings-sdk";
import { requestStatusLabels } from "@/lib/listing-labels";
import { cn } from "@/lib/utils";

type StepState = "done" | "current" | "todo" | "failed";

type Step = { label: string; state: StepState };

const endedEarly = ["cancelled", "expired", "no_show"];

function steps(request: ListingRequest): Step[] {
  if (endedEarly.includes(request.status)) {
    return [
      { label: "Reserved", state: "done" },
      { label: requestStatusLabels[request.status], state: "failed" },
    ];
  }

  const reached = request.collectedAt ? 3 : request.codeGeneratedBy ? 2 : 1;
  return [
    { label: "Reserved", state: "done" },
    { label: "Code ready", state: reached >= 2 ? "done" : "current" },
    {
      label: "Collected",
      state: reached >= 3 ? "done" : reached === 2 ? "current" : "todo",
    },
  ];
}

const dot: Record<StepState, string> = {
  done: "border-primary bg-primary text-primary-foreground",
  current: "border-primary text-primary",
  todo: "border-border text-transparent",
  failed: "border-destructive bg-destructive/16 text-destructive",
};

/** Grab-style tracker for where a claim sits in the pickup workflow. */
export function RequestProgress({ request }: { request: ListingRequest }) {
  const items = steps(request);
  const ref = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-progress=line]", {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
        });
        gsap.from("[data-progress=dot]", {
          scale: 0.6,
          autoAlpha: 0,
          duration: 0.4,
          stagger: 0.1,
          ease: "back.out(2)",
        });
      });
    },
    { scope: ref },
  );

  return (
    <ol className="flex" ref={ref}>
      {items.map((step, index) => {
        const filled = step.state === "done" || step.state === "failed";
        return (
          <li key={step.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center" aria-hidden>
              <span
                data-progress="line"
                className={cn(
                  "h-0.5 flex-1",
                  index === 0 && "bg-transparent",
                  index > 0 && (filled ? "bg-primary" : "bg-border"),
                  index > 0 && step.state === "failed" && "bg-destructive",
                )}
              />
              <span
                data-progress="dot"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                  dot[step.state],
                )}
              >
                {step.state === "failed" ? (
                  <X className="size-3.5" />
                ) : step.state === "current" ? (
                  <span className="size-2 rounded-full bg-primary motion-safe:animate-pulse" />
                ) : (
                  <Check className="size-3.5" />
                )}
              </span>
              <span
                data-progress="line"
                className={cn(
                  "h-0.5 flex-1",
                  index === items.length - 1
                    ? "bg-transparent"
                    : items[index + 1].state === "done" ||
                        items[index + 1].state === "failed"
                      ? "bg-primary"
                      : "bg-border",
                  index < items.length - 1 &&
                    items[index + 1].state === "failed" &&
                    "bg-destructive",
                )}
              />
            </div>
            <span
              className={cn(
                "text-center text-xs",
                step.state === "todo" && "text-muted-foreground",
                step.state === "failed" && "text-destructive",
                step.state === "current" && "font-medium",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
