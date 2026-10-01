package store

import (
	"context"

	"github.com/google/uuid"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

// inTx runs fn against repositories bound to one transaction, committing only
// when fn returns nil.
func (s *Store) inTx(ctx context.Context, fn func(*Store) error) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	scoped := &Store{
		pool:              s.pool,
		Users:             &Users{db: tx},
		Organisations:     &Organisations{db: tx},
		LoginRestrictions: &LoginRestrictions{db: tx},
		AuditEvents:       &AuditEvents{db: tx},
	}
	if err := fn(scoped); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// SetUserStatus changes a user's status and appends its audit event in one
// transaction, so neither is ever retained without the other.
func (s *Store) SetUserStatus(ctx context.Context, id uuid.UUID, status domain.UserStatus, entry domain.AuditEntry) error {
	return s.inTx(ctx, func(tx *Store) error {
		if err := tx.Users.UpdateStatus(ctx, id, status); err != nil {
			return err
		}
		return tx.AuditEvents.Record(ctx, entry)
	})
}

// SetOrgStatus persists o's already-applied status transition and appends its
// audit event in one transaction.
func (s *Store) SetOrgStatus(ctx context.Context, o *domain.Organisation, entry domain.AuditEntry) error {
	return s.inTx(ctx, func(tx *Store) error {
		if err := tx.Organisations.UpdateStatus(ctx, o); err != nil {
			return err
		}
		return tx.AuditEvents.Record(ctx, entry)
	})
}

// ClearLoginRestriction clears a failed-login restriction and appends its
// audit event in one transaction.
func (s *Store) ClearLoginRestriction(ctx context.Context, username string, entry domain.AuditEntry) error {
	return s.inTx(ctx, func(tx *Store) error {
		if err := tx.LoginRestrictions.AdminUnlock(ctx, username); err != nil {
			return err
		}
		return tx.AuditEvents.Record(ctx, entry)
	})
}
