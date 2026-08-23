import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { Listing } from "@rescufood/listings-sdk";

/** The listing's first photo, or a placeholder while listings have none. */
export function ListingPhoto({ listing }: { listing?: Listing }) {
  const image = listing?.images[0];
  if (image) {
    return (
      <div className="relative aspect-video w-full">
        <Image
          src={image.url}
          alt=""
          fill
          className="rounded-lg object-cover"
        />
      </div>
    );
  }
  return (
    <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
      <ImageOff className="size-6 text-muted-foreground" aria-hidden />
      <span className="sr-only">No photo yet</span>
    </div>
  );
}
