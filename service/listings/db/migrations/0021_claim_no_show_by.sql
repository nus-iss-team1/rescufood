ALTER TABLE "requests" ADD COLUMN "no_show_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "no_show_by" uuid;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "no_show_by_org_id" uuid;--> statement-breakpoint
-- One-time backfill from the audit log; no-shows recorded before it existed stay null.
UPDATE "requests" SET "no_show_at" = a."created_at", "no_show_by" = a."user_id", "no_show_by_org_id" = a."org_id"
FROM "audit_log" a
WHERE a."entity_type" = 'claim' AND a."action" = 'claim.no_show'
  AND a."entity_id" = "requests"."id" AND "requests"."status" = 'no_show';
