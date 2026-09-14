-- Cross-service FK constraints against organisations/users, owned and
-- migrated by service/profile (Go/golang-migrate). Hand-written rather than
-- drizzle-kit-generated: those two tables are intentionally excluded from
-- this service's schema.ts / drizzle-kit scan (see src/db/external.schema.ts)
-- so service/profile remains the sole owner of their DDL. Both services
-- share one physical Postgres database, so a plain FK still applies here.

ALTER TABLE "listings" ADD CONSTRAINT "listings_donor_org_id_organisations_id_fk"
  FOREIGN KEY ("donor_org_id") REFERENCES "public"."organisations"("id");
ALTER TABLE "listings" ADD CONSTRAINT "listings_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");

ALTER TABLE "requests" ADD CONSTRAINT "requests_rescue_org_id_organisations_id_fk"
  FOREIGN KEY ("rescue_org_id") REFERENCES "public"."organisations"("id");
ALTER TABLE "requests" ADD CONSTRAINT "requests_claimed_by_users_id_fk"
  FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id");
ALTER TABLE "requests" ADD CONSTRAINT "requests_responded_by_users_id_fk"
  FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id");
ALTER TABLE "requests" ADD CONSTRAINT "requests_code_generated_by_users_id_fk"
  FOREIGN KEY ("code_generated_by") REFERENCES "public"."users"("id");
ALTER TABLE "requests" ADD CONSTRAINT "requests_verified_by_users_id_fk"
  FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk"
  FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id");

ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_org_id_organisations_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id");
