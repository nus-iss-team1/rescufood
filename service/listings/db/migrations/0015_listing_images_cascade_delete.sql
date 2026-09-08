-- listing_images.listing_id now cascades on delete, so removing a listing
-- (or a DB admin hard-deleting one) takes its image rows with it.
ALTER TABLE "listing_images" DROP CONSTRAINT "listing_images_listing_id_listings_id_fk";
--> statement-breakpoint
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;