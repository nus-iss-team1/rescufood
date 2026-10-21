ALTER TABLE "requests" ADD COLUMN "cancelled_by" uuid;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "cancelled_by_org_id" uuid;--> statement-breakpoint
-- One-time backfill from the audit log; claims cancelled before it existed stay null.
UPDATE "requests" SET "cancelled_by" = a."user_id", "cancelled_by_org_id" = a."org_id"
FROM "audit_log" a
WHERE a."entity_type" = 'claim' AND a."action" = 'claim.cancelled'
  AND a."entity_id" = "requests"."id" AND "requests"."status" = 'cancelled';
