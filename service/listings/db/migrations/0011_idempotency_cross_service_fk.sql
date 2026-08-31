-- Cross-service FK against organisations, owned by service/profile - the same
-- pattern as 0001_cross_service_fks.sql. drizzle-kit does not manage that
-- table (see src/db/external.schema.ts), so the constraint is hand-written.

ALTER TABLE "request_idempotency_keys" ADD CONSTRAINT "request_idempotency_keys_rescue_org_id_organisations_id_fk"
  FOREIGN KEY ("rescue_org_id") REFERENCES "public"."organisations"("id");
