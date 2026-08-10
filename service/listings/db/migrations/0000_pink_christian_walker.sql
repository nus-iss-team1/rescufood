CREATE TYPE "public"."listing_category" AS ENUM('produce', 'bakery', 'dairy', 'meat_seafood', 'prepared_food', 'packaged_dry_goods', 'beverages', 'other');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'available', 'reserved', 'collected', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'retrying');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('claim_requested', 'claim_accepted', 'claim_declined', 'claim_superseded', 'claim_cancelled', 'listing_material_change', 'pickup_reminder', 'pickup_completed', 'listing_expired');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'accepted', 'declined', 'superseded', 'cancelled', 'completed', 'no_show', 'expired');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"org_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"s3_key" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donor_org_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"category" "listing_category" NOT NULL,
	"description" text NOT NULL,
	"remaining_quantity" numeric(10, 2) NOT NULL,
	"unit" text NOT NULL,
	"allergens" text[] DEFAULT '{}' NOT NULL,
	"handling_instructions" text DEFAULT '' NOT NULL,
	"use_by" timestamp with time zone NOT NULL,
	"pickup_location" text NOT NULL,
	"pickup_window_start" timestamp with time zone NOT NULL,
	"pickup_window_end" timestamp with time zone NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"cancelled_reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pickup_window_valid" CHECK ("listings"."pickup_window_end" > "listings"."pickup_window_start"),
	CONSTRAINT "remaining_quantity_non_negative" CHECK ("listings"."remaining_quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"listing_id" uuid,
	"request_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempted_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"failure_reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"rescue_org_id" uuid NOT NULL,
	"claimed_by" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"requested_quantity" numeric(10, 2) NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_by" uuid,
	"responded_at" timestamp with time zone,
	"decline_reason" text DEFAULT '' NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text DEFAULT '' NOT NULL,
	"pickup_code_hash" text,
	"code_expires_at" timestamp with time zone,
	"code_generated_by" uuid,
	"verified_by" uuid,
	"collected_quantity" numeric(10, 2),
	"collected_at" timestamp with time zone,
	"no_show_reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requests_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "requested_quantity_positive" CHECK ("requests"."requested_quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_user_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_images_listing_position_uq" ON "listing_images" USING btree ("listing_id","position");--> statement-breakpoint
CREATE INDEX "listing_images_listing_id_idx" ON "listing_images" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listings_discovery_idx" ON "listings" USING btree ("status","pickup_location","category");--> statement-breakpoint
CREATE INDEX "listings_expiry_scan_idx" ON "listings" USING btree ("pickup_window_end") WHERE status = 'available';--> statement-breakpoint
CREATE INDEX "listings_donor_org_id_idx" ON "listings" USING btree ("donor_org_id");--> statement-breakpoint
CREATE INDEX "notifications_retry_queue_idx" ON "notifications" USING btree ("status","created_at") WHERE status in ('pending', 'retrying');--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_user_id");--> statement-breakpoint
CREATE INDEX "requests_listing_id_idx" ON "requests" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "requests_rescue_org_id_idx" ON "requests" USING btree ("rescue_org_id");--> statement-breakpoint
CREATE INDEX "requests_status_idx" ON "requests" USING btree ("status");
