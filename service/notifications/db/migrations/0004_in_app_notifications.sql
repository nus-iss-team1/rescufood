-- In-app notification channel: per-recipient read state, a rendered body, and
-- a producer-supplied event id for duplicate-processing protection.
ALTER TABLE "notifications" ALTER COLUMN "recipient_user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "event_id" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "body" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
-- One successful email per event per recipient.
CREATE UNIQUE INDEX "notifications_email_dedupe_uq" ON "notifications" USING btree ("event_id","recipient_email") WHERE "notifications"."channel" = 'email' AND "notifications"."status" = 'sent' AND "notifications"."event_id" IS NOT NULL;--> statement-breakpoint
-- One in-app notification per event per recipient.
CREATE UNIQUE INDEX "notifications_inapp_dedupe_uq" ON "notifications" USING btree ("event_id","recipient_user_id") WHERE "notifications"."channel" = 'in_app' AND "notifications"."event_id" IS NOT NULL;
