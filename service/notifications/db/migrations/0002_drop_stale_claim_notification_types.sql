-- 'claim_accepted'/'claim_declined'/'claim_superseded' map to request
-- states the first-come-first-served refactor removed - no producer ever
-- emitted them. Drop any stray rows so the enum can be recreated without
-- them.
DELETE FROM "notifications" WHERE "type" IN ('claim_accepted', 'claim_declined', 'claim_superseded');--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."notification_type";--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('org_approved', 'user_welcome', 'claim_requested', 'claim_cancelled', 'listing_material_change', 'pickup_reminder', 'pickup_completed', 'listing_expired');--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE "public"."notification_type" USING "type"::"public"."notification_type";