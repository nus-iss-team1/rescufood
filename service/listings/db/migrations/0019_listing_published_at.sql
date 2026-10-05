ALTER TABLE "listings" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
-- One-time backfill: lots already past draft take their creation time; draft and cancelled stay null.
UPDATE "listings" SET "published_at" = "created_at" WHERE "status" NOT IN ('draft', 'cancelled');--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "draft_has_no_published_at" CHECK ("listings"."status" <> 'draft' or "listings"."published_at" is null);
