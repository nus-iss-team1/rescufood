"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListingRequest, RequestStatus } from "@rescufood/listings-sdk";

import { RequestCards } from "@/components/requests/request-cards";
import { RequestList } from "@/components/requests/request-list";
import { loadRequestsPage } from "@/app/feed-actions";

/**
 * The organisation's requests, fetched a page at a time as the reader
 * reaches the end. `initial` is the server-rendered first page and `total`
 * the full match count, which together decide whether more remain.
 */
export function RequestsView({
  initial,
  total,
  status,
  layout,
}: {
  initial: ListingRequest[];
  total: number;
  status: RequestStatus | null;
  layout: "list" | "card";
}) {
  // Only the pages scrolled past the first. `initial` stays the source of
  // truth for the first page, so a server re-render after a cancel or a
  // decision is not masked by stale state.
  const [extra, setExtra] = useState<ListingRequest[]>([]);
  const [seenInitial, setSeenInitial] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  if (initial !== seenInitial) {
    setSeenInitial(initial);
    setExtra([]);
    setExhausted(false);
  }

  const requests = useMemo(() => {
    const first = new Set(initial.map((r) => r.id));
    return [...initial, ...extra.filter((r) => !first.has(r.id))];
  }, [extra, initial]);
  const more = !exhausted && requests.length < total;

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadRequestsPage(status, requests.length);
      // An empty page means the feed shifted under us; stop asking.
      if (next.length === 0) {
        setExhausted(true);
        return;
      }
      const seen = new Set(requests.map((r) => r.id));
      setExtra((shown) => [...shown, ...next.filter((r) => !seen.has(r.id))]);
    } catch {
      setExhausted(true);
    } finally {
      setLoading(false);
    }
  }, [requests, status]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !more || loading) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMore();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, loading, more]);

  return (
    <>
      {layout === "card" ? (
        <RequestCards requests={requests} />
      ) : (
        <RequestList requests={requests} />
      )}

      {more && (
        <div
          ref={sentinel}
          className="py-6 text-center text-xs text-muted-foreground"
        >
          Loading more… ({requests.length} of {total})
        </div>
      )}
    </>
  );
}
