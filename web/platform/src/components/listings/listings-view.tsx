"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { Listing } from "@rescufood/listings-sdk";

import { ListingCards } from "@/components/listings/listing-cards";
import { ListingList } from "@/components/listings/listing-list";
import { DeleteListingButton } from "@/components/listings/delete-listing-button";
import { buttonVariants } from "@rescufood/ui/components/button";
import { cn } from "@/lib/utils";

/** Rows added each time the sentinel comes into view. */
const STEP = 12;

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
    </div>
  );
}

/**
 * The donor's listings, revealed a page at a time as the reader reaches the
 * end. Every listing is already loaded; this only paces the rendering.
 */
export function ListingsView({
  listings,
  layout,
  empty = "No listings here yet.",
}: {
  listings: Listing[];
  layout: "list" | "card";
  empty?: string;
}) {
  const [count, setCount] = useState(() => Math.min(STEP, listings.length));
  const sentinel = useRef<HTMLDivElement>(null);
  const more = count < listings.length;

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      setCount((shown) => Math.min(shown + STEP, listings.length));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [listings.length, more]);

  const shown = listings.slice(0, count);

  return (
    <>
      {layout === "card" ? (
        <ListingCards listings={shown} empty={empty} action={rowActions} />
      ) : (
        <ListingList listings={shown} empty={empty} action={rowActions} />
      )}

      {more && (
        <div
          ref={sentinel}
          className="py-6 text-center text-xs text-muted-foreground"
        >
          Loading more… ({count} of {listings.length})
        </div>
      )}
    </>
  );
}
