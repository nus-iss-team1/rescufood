import type { ComponentType } from "react";
import {
  Apple,
  Calendar,
  CalendarClock,
  Coffee,
  Fish,
  Layers,
  MapPin,
  Milk,
  Package,
  ShieldAlert,
  TriangleAlert,
  Utensils,
  Wheat,
} from "lucide-react";
import type { Listing, ListingCategory } from "@rescufood/listings-sdk";

import {
  categoryLabels,
  listingStatusVariant,
  pickupWindow,
  quantity,
  shortDate,
} from "@/lib/listing-labels";
import { ListingPhoto } from "@/components/listings/listing-photo";
import { ClaimLotForm } from "@/components/browse/claim-lot-form";
import { Badge } from "@rescufood/ui/components/badge";
import {
  Card,
  CardContent,
} from "@rescufood/ui/components/card";
import { Separator } from "@rescufood/ui/components/separator";

const categoryIcons: Record<
  ListingCategory,
  ComponentType<{ className?: string }>
> = {
  produce: Apple,
  bakery: Wheat,
  dairy: Milk,
  meat_seafood: Fish,
  prepared_food: Utensils,
  packaged_dry_goods: Package,
  beverages: Coffee,
  other: Layers,
};

interface ListingDetailViewProps {
  listing: Listing;
}

export function ListingDetailView({ listing }: ListingDetailViewProps) {
  const CategoryIcon = listing.category
    ? categoryIcons[listing.category] ?? Layers
    : Layers;

  const lotQuantity =
    listing.remainingQuantity != null && listing.unit
      ? quantity(listing.remainingQuantity, listing.unit)
      : "Quantity not specified";

  const hasAllergens = listing.allergens && listing.allergens.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Main Details Card */}
      <Card data-animate="card" className="overflow-hidden border-border bg-card shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Photo Column */}
          <div className="p-6 md:col-span-5 flex flex-col justify-center bg-muted/20">
            <div className="overflow-hidden rounded-xl border border-border bg-background shadow-xs">
              <ListingPhoto listing={listing} />
            </div>
          </div>

          {/* Details Column */}
          <div className="p-6 md:col-span-7 flex flex-col justify-between">
            <div>
              {/* Status and Category Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
                    <CategoryIcon className="size-3.5" />
                    <span>
                      {listing.category
                        ? categoryLabels[listing.category]
                        : "Uncategorized"}
                    </span>
                  </Badge>

                  <Badge variant="outline" className="px-3 py-1 font-semibold text-foreground">
                    <Package className="mr-1.5 size-3.5 text-muted-foreground" />
                    {lotQuantity}
                  </Badge>
                </div>

                <Badge
                  variant={listingStatusVariant[listing.status]}
                  className="px-3 py-1 font-semibold tracking-wide"
                >
                  {listing.status.toUpperCase()}
                </Badge>
              </div>

              {/* Title and Description */}
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {listing.description || "Untitled Surplus Food Lot"}
              </h1>

              {/* Key Timeline & Location Grid */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-border/80 bg-muted/20 p-4">
                {/* Use-by Date */}
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background border border-border text-primary shadow-xs">
                    <Calendar className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Use-by / Best-before
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {listing.useBy ? shortDate(listing.useBy) : "Not specified"}
                    </p>
                  </div>
                </div>

                {/* Pickup Window */}
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background border border-border text-primary shadow-xs">
                    <CalendarClock className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Pickup Window
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {listing.pickupWindowStart && listing.pickupWindowEnd
                        ? pickupWindow(
                            listing.pickupWindowStart,
                            listing.pickupWindowEnd,
                          )
                        : "Time not set"}
                    </p>
                  </div>
                </div>

                {/* Pickup Location */}
                <div className="flex items-start gap-3 sm:col-span-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background border border-border text-primary shadow-xs">
                    <MapPin className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Pickup Location
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {listing.pickupLocation || "Location not provided"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Extended Food Safety & Handling Metadata */}
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Allergen Declarations */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <TriangleAlert
                  className={
                    hasAllergens
                      ? "size-4 text-destructive"
                      : "size-4 text-muted-foreground opacity-50"
                  }
                />
                <span>Allergen Declarations</span>
              </div>

              {hasAllergens ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {listing.allergens.map((allergen) => (
                    <Badge
                      key={allergen}
                      variant="destructive"
                      className="flex items-center gap-1 px-2.5 py-1 text-xs"
                    >
                      <TriangleAlert className="size-3" />
                      <span>{allergen}</span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No declared allergens reported for this surplus food lot.
                </p>
              )}
            </div>

            {/* Handling & Storage Instructions */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldAlert className="size-4 text-primary" />
                <span>Handling & Storage Instructions</span>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm text-foreground/90">
                {listing.handlingInstructions ? (
                  <p>{listing.handlingInstructions}</p>
                ) : (
                  <p className="text-muted-foreground">
                    Standard food handling and hygiene protocols apply. Keep
                    in original packaging until distribution.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claim Lot Action Card with State Gating */}
      <div data-animate="field">
        <ClaimLotForm listing={listing} />
      </div>
    </div>
  );
}
