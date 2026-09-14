ALTER TABLE "listings" ALTER COLUMN "category" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "remaining_quantity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "unit" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "use_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "pickup_location" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "pickup_window_start" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "pickup_window_end" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "available_listing_is_complete" CHECK ("listings"."status" <> 'available' or (
        "listings"."category" is not null and
        "listings"."description" is not null and
        "listings"."remaining_quantity" is not null and
        "listings"."unit" is not null and
        "listings"."use_by" is not null and
        "listings"."pickup_location" is not null and
        "listings"."pickup_window_start" is not null and
        "listings"."pickup_window_end" is not null and
        coalesce(array_length("listings"."allergens", 1), 0) > 0
      ));