"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { Listing, ListingStatus } from "@rescufood/listings-sdk";

import { ListingCards } from "@/components/listings/listing-cards";
import { ListingList } from "@/components/listings/listing-list";
import { DeleteListingButton } from "@/components/listings/delete-listing-button";
import { loadListingsPage } from "@/app/feed-actions";
import { buttonVariants } from "@rescufood/ui/components/button";
import { cn } from "@/lib/utils";

/** Past these a listing opens read-only, so the verb changes with it. */
const LOCKED_STATUSES = new Set([
  "reserved",
  "collected",
  "expired",
  "cancelled",
]);

function rowActions(listing: Listing) {
  const locked = LOCKED_STATUSES.has(listing.status);
  const Icon = locked ? Eye : Pencil;
  const label = locked ? "View listing" : "Edit listing";

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/listings/${listing.id}`}
        prefetch={false}
        aria-label={label}
        title={label}
        className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}
      >
        <Icon className="size-4" aria-hidden />
      </Link>
      {!locked && (
        <DeleteListingButton
          listingId={listing.id}
          listingDescription={listing.description}
          size="icon-sm"
          variant="outline"
        >
          <Trash2 className="size-4" aria-hidden />
          {/* "Delete", not "Delete listing": that is the confirm button in
              the dialog this opens, and two would be ambiguous. */}
          <span className="sr-only">Delete</span>
        </DeleteListingButton>
      )}
    </div>
  );
}

/**
 * The donor's listings, fetched a page at a time as the reader reaches the
 * end. `initial` is the server-rendered first page and `total` the full
 * match count, which together decide whether more remain.
 */
export function ListingsView({
  initial,
  total,
  status,
  layout,
  empty = "No listings here yet.",
}: {
  initial: Listing[];
  total: number;
  status: ListingStatus | null;
  layout: "list" | "card";
  empty?: string;
}) {
  // Only the pages scrolled past the first. `initial` stays the source of
  // truth for the first page, so a server re-render after an edit or delete
  // is not masked by stale state.
  const [extra, setExtra] = useState<Listing[]>([]);
  const [seenInitial, setSeenInitial] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  if (initial !== seenInitial) {
    setSeenInitial(initial);
    setExtra([]);
    setExhausted(false);
  }

  const listings = useMemo(() => {
    const first = new Set(initial.map((l) => l.id));
    return [...initial, ...extra.filter((l) => !first.has(l.id))];
  }, [extra, initial]);
  const more = !exhausted && listings.length < total;

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadListingsPage(status, listings.length);
      // An empty page means the feed shifted under us; stop asking.
      if (next.length === 0) {
        setExhausted(true);
        return;
      }
      const seen = new Set(listings.map((l) => l.id));
      setExtra((shown) => [...shown, ...next.filter((l) => !seen.has(l.id))]);
    } catch {
      setExhausted(true);
    } finally {
      setLoading(false);
    }
  }, [listings, status]);

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
        <ListingCards listings={listings} empty={empty} action={rowActions} />
      ) : (
        <ListingList listings={listings} empty={empty} action={rowActions} />
      )}

      {more && (
        <div
          ref={sentinel}
          className="py-6 text-center text-xs text-muted-foreground"
        >
          Loading more… ({listings.length} of {total})
        </div>
      )}
    </>
  );
}
