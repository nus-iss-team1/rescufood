-- listings.remaining_quantity is misnamed under first-come-first-served: a
-- claim takes the whole lot and never decrements it. Rename to `quantity`.
ALTER TABLE "listings" RENAME COLUMN "remaining_quantity" TO "quantity";--> statement-breakpoint
ALTER TABLE "listings" RENAME CONSTRAINT "remaining_quantity_non_negative" TO "quantity_non_negative";--> statement-breakpoint
ALTER TABLE "requests" DROP CONSTRAINT "requests_idempotency_key_unique";--> statement-breakpoint
-- first-come-first-served removes the donor decision. A claim is now born
-- 'active' and can only end completed/cancelled/no_show/expired. Rows in the
-- dropped 'pending'/'declined'/'superseded' states never held listing state,
-- so drop them; remap the surviving 'accepted' claims to 'active'.
DELETE FROM "requests" WHERE "status" IN ('pending', 'declined', 'superseded');--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
UPDATE "requests" SET "status" = 'active' WHERE "status" = 'accepted';--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "status" SET DEFAULT 'active'::text;--> statement-breakpoint
DROP TYPE "public"."request_status";--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('active', 'cancelled', 'completed', 'no_show', 'expired');--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."request_status";--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "status" SET DATA TYPE "public"."request_status" USING "status"::"public"."request_status";--> statement-breakpoint
CREATE UNIQUE INDEX "requests_rescue_org_idempotency_key_uq" ON "requests" USING btree ("rescue_org_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "requests_active_claim_per_listing_uq" ON "requests" USING btree ("listing_id") WHERE status = 'active';--> statement-breakpoint
ALTER TABLE "requests" DROP COLUMN "responded_by";--> statement-breakpoint
ALTER TABLE "requests" DROP COLUMN "responded_at";--> statement-breakpoint
ALTER TABLE "requests" DROP COLUMN "decline_reason";
