//go:build integration

// Package integration holds database-backed tests for service/profile.
// They run only under `go test -tags=integration ./integration/...` and
// share one throwaway Postgres started by TestMain.
package integration

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"

	profiledb "github.com/nus-iss-team1/rescufood/service/profile/db"
	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
	"github.com/nus-iss-team1/rescufood/service/profile/internal/store"
)

var testPool *pgxpool.Pool

func TestMain(m *testing.M) {
	ctx := context.Background()

	container, err := tcpostgres.Run(ctx, "postgres:17-alpine",
		tcpostgres.WithDatabase("profile"),
		tcpostgres.WithUsername("profile"),
		tcpostgres.WithPassword("profile"),
		tcpostgres.BasicWaitStrategies(),
	)
	if err != nil {
		fmt.Fprintln(os.Stderr, "start postgres:", err)
		os.Exit(1)
	}

	dsn, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		fmt.Fprintln(os.Stderr, "connection string:", err)
		os.Exit(1)
	}
	if err := runMigrations(dsn); err != nil {
		fmt.Fprintln(os.Stderr, "migrate:", err)
		os.Exit(1)
	}
	if testPool, err = pgxpool.New(ctx, dsn); err != nil {
		fmt.Fprintln(os.Stderr, "pool:", err)
		os.Exit(1)
	}
	if err := createAuditLog(ctx); err != nil {
		fmt.Fprintln(os.Stderr, "create audit_log:", err)
		os.Exit(1)
	}

	code := m.Run()

	testPool.Close()
	_ = testcontainers.TerminateContainer(container)
	os.Exit(code)
}

func runMigrations(dsn string) error {
	src, err := iofs.New(profiledb.MigrationsFS, "migrations")
	if err != nil {
		return err
	}
	m, err := migrate.NewWithSourceInstance("iofs", src,
		strings.Replace(dsn, "postgres://", "pgx5://", 1))
	if err != nil {
		return err
	}
	defer m.Close()
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}
	return nil
}

// createAuditLog mirrors the audit_log table that service/listings owns and
// migrates, because this service writes account-administration events to it
// and golang-migrate above only applies this service's own migrations.
//
// Keep in sync with service/listings/src/db/schema.ts. Only
// what this service depends on is reproduced - listings' read indexes are not.
func createAuditLog(ctx context.Context) error {
	_, err := testPool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS audit_log (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id uuid REFERENCES users(id),
			org_id uuid REFERENCES organisations(id),
			action text NOT NULL,
			entity_type text NOT NULL,
			entity_id uuid,
			subject text,
			reason text NOT NULL DEFAULT '',
			metadata jsonb NOT NULL DEFAULT '{}',
			created_at timestamptz NOT NULL DEFAULT now()
		);

		CREATE OR REPLACE FUNCTION audit_log_reject_mutation() RETURNS trigger
			LANGUAGE plpgsql AS $$
		BEGIN
			RAISE EXCEPTION 'audit_log is append-only: % is not permitted', TG_OP
				USING ERRCODE = 'restrict_violation';
		END;
		$$;

		DROP TRIGGER IF EXISTS audit_log_append_only ON audit_log;
		CREATE TRIGGER audit_log_append_only
			BEFORE UPDATE OR DELETE ON audit_log
			FOR EACH ROW EXECUTE FUNCTION audit_log_reject_mutation();
	`)
	return err
}

func ctxt() context.Context { return context.Background() }

// resetDB truncates every table; call at the top of each test.
func resetDB(t *testing.T) {
	t.Helper()
	_, err := testPool.Exec(ctxt(),
		"TRUNCATE users, organisations, login_restrictions, audit_log RESTART IDENTITY CASCADE")
	if err != nil {
		t.Fatalf("reset: %v", err)
	}
}

func newStore(t *testing.T) *store.Store {
	t.Helper()
	resetDB(t)
	return store.New(testPool)
}

// seedOrg inserts an approved donor organisation and returns it.
func seedOrg(t *testing.T, s *store.Store, mutate ...func(*domain.Organisation)) *domain.Organisation {
	t.Helper()
	slug := uuid.NewString()[:8]
	org := &domain.Organisation{
		ID:           uuid.New(),
		Name:         "Org " + slug,
		Type:         domain.OrgDonor,
		Status:       domain.OrgApproved,
		Domain:       slug + ".example.org",
		ContactEmail: "contact-" + slug + "@example.org",
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	for _, fn := range mutate {
		fn(org)
	}
	if err := s.Organisations.Create(ctxt(), org); err != nil {
		t.Fatalf("seed org: %v", err)
	}
	return org
}
