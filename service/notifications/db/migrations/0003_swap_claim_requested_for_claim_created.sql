-- FCFS has no request step: claim_requested -> claim_created. Nothing ever
-- emitted the old value; clear any stray rows before the enum recreate.
DELETE FROM "notifications" WHERE "type" = 'claim_requested';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."notification_type";--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('org_approved', 'user_welcome', 'claim_created', 'claim_cancelled', 'listing_material_change', 'pickup_reminder', 'pickup_completed', 'listing_expired');--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE "public"."notification_type" USING "type"::"public"."notification_type";