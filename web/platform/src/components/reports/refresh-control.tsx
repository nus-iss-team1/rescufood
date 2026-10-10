"use client";

import { useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@rescufood/ui/components/button";
import { cn } from "@/lib/utils";

const POLL_MS = 5 * 60_000;

/**
 * Re-runs the page's server components, on demand and every five minutes.
 * Polling pauses while the tab is hidden and catches up on return.
 */
export function RefreshControl() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      refresh();
    };
    const id = setInterval(tick, POLL_MS);

    // A tab hidden across a tick would otherwise show stale data until the
    // next one, up to five minutes later.
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={refresh}
      disabled={pending}
      aria-label="Refresh reports"
      className="h-8 gap-1.5 px-3 text-xs"
    >
      <RefreshCw className={cn("size-3.5", pending && "animate-spin")} />
      {pending ? "Refreshing…" : "Refresh"}
    </Button>
  );
}
