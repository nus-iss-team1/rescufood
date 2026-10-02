-- Enforces append-only on audit_log at the table, now that service/profile
-- writes here too and the guarantee can no longer rest on AuditRepository
-- being the only write path. TRUNCATE is statement-level and is deliberately
-- not covered: the integration harness resets with TRUNCATE between tests.
CREATE OR REPLACE FUNCTION audit_log_reject_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_log_reject_mutation();
