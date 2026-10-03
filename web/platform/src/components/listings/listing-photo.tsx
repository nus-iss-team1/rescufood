import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { Listing } from "@rescufood/listings-sdk";

/** The listing's first photo, or a placeholder while listings have none. */
export function ListingPhoto({
  listing,
  imageUrl,
  overlay,
}: {
  listing?: Listing;
  /** For callers holding only a url rather than a whole listing. */
  imageUrl?: string | null;
  overlay?: React.ReactNode;
}) {
  const url = imageUrl ?? listing?.images[0]?.url;

  return (
    <div className="relative aspect-video w-full">
      {url ? (
        <Image src={url} alt="" fill className="rounded-lg object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center rounded-lg bg-muted">
          <ImageOff className="size-6 text-muted-foreground" aria-hidden />
          <span className="sr-only">No photo yet</span>
        </div>
      )}
      {overlay && <div className="absolute left-2 top-2">{overlay}</div>}
    </div>
  );
}
