CREATE TYPE "public"."idempotency_status" AS ENUM('pending', 'completed');--> statement-breakpoint
CREATE TABLE "request_idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rescue_org_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"status" "idempotency_status" DEFAULT 'pending' NOT NULL,
	"claim_id" uuid,
	"response_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DROP INDEX "requests_rescue_org_idempotency_key_uq";--> statement-breakpoint
ALTER TABLE "request_idempotency_keys" ADD CONSTRAINT "request_idempotency_keys_claim_id_requests_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "request_idempotency_keys_org_key_uq" ON "request_idempotency_keys" USING btree ("rescue_org_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "request_idempotency_keys_expires_at_idx" ON "request_idempotency_keys" USING btree ("expires_at");