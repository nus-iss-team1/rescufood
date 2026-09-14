// Package store persists profile domain types in postgres.
package store

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// pgxDB is the query surface shared by *pgxpool.Pool and pgx.Tx.
type pgxDB interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type Store struct {
	pool              *pgxpool.Pool
	Users             *Users
	Organisations     *Organisations
	LoginRestrictions *LoginRestrictions
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{
		pool:              pool,
		Users:             &Users{db: pool},
		Organisations:     &Organisations{db: pool},
		LoginRestrictions: &LoginRestrictions{db: pool},
	}
}
