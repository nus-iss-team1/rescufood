"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Counts down from `seconds`, then replaces the current route with `to`.
 * Renders the remaining seconds as a live region.
 */
export function AutoRedirect({
  to,
  seconds = 5,
}: {
  to: string;
  seconds?: number;
}) {
  const router = useRouter();
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const tick = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (left <= 0) router.replace(to);
  }, [left, router, to]);

  return (
    <p aria-live="polite" className="text-sm text-muted-foreground">
      Taking you to sign in in {Math.max(left, 0)}s.
    </p>
  );
}
