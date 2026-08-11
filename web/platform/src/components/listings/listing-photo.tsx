import { ImageOff } from "lucide-react";
import type { Listing } from "@rescufood/listings-sdk";

/** The listing's first photo, or a placeholder while listings have none. */
export function ListingPhoto({ listing }: { listing?: Listing }) {
  const image = listing?.images[0];
  if (image) {
    // Presigned urls rotate, so next/image has nothing stable to optimise.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image.url}
        alt=""
        className="aspect-video w-full rounded-lg object-cover"
      />
    );
  }
  return (
    <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
      <ImageOff className="size-6 text-muted-foreground" aria-hidden />
      <span className="sr-only">No photo yet</span>
    </div>
  );
}
