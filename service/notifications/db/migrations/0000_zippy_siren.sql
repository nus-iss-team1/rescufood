CREATE TYPE "public"."notification_channel" AS ENUM('email', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('org_approved', 'claim_requested', 'claim_accepted', 'claim_declined', 'claim_superseded', 'claim_cancelled', 'listing_material_change', 'pickup_reminder', 'pickup_completed', 'listing_expired');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_email" text NOT NULL,
	"recipient_user_id" uuid,
	"type" "notification_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "notification_status" NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "notifications_recipient_email_idx" ON "notifications" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "notifications_recipient_user_id_idx" ON "notifications" USING btree ("recipient_user_id");