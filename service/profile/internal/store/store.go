// Package store persists profile domain types in postgres.
package store

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

// pgxDB is the query surface shared by *pgxpool.Pool and pgx.Tx.
type pgxDB interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type Store struct {
	pool          *pgxpool.Pool
	Users         *Users
	Organisations *Organisations
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{
		pool:          pool,
		Users:         &Users{db: pool},
		Organisations: &Organisations{db: pool},
	}
}

// withTx runs fn in a transaction, committing when it returns nil.
func (s *Store) withTx(ctx context.Context, fn func(tx pgx.Tx) error) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// CreateOrganisationWithOwner inserts org, attaches the owner as its
// first member and appends an audit entry, in one transaction.
func (s *Store) CreateOrganisationWithOwner(ctx context.Context, org *domain.Organisation, ownerID uuid.UUID) error {
	return s.withTx(ctx, func(tx pgx.Tx) error {
		orgs := &Organisations{db: tx}
		if err := orgs.Create(ctx, org); err != nil {
			return err
		}
		tag, err := tx.Exec(ctx,
			`UPDATE users SET org_id = $1 WHERE id = $2 AND org_id IS NULL`,
			org.ID, ownerID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return domain.ErrAlreadyInOrg
		}
		return nil
	})
}
