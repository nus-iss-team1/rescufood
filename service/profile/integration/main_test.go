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

func ctxt() context.Context { return context.Background() }

// resetDB truncates every table; call at the top of each test.
func resetDB(t *testing.T) {
	t.Helper()
	_, err := testPool.Exec(ctxt(),
		"TRUNCATE users, organisations, login_restrictions RESTART IDENTITY CASCADE")
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
