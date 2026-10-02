package store

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

// inTx runs fn against repositories bound to one transaction.
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

// SetUserStatus changes a user's status and appends its audit event atomically.
func (s *Store) SetUserStatus(ctx context.Context, id uuid.UUID, status domain.UserStatus, entry domain.AuditEntry) error {
	return s.inTx(ctx, func(tx *Store) error {
		if err := tx.Users.UpdateStatus(ctx, id, status); err != nil {
			return err
		}
		return tx.AuditEvents.Record(ctx, entry)
	})
}

// SetOrgStatus persists o's applied status transition and its audit event atomically.
func (s *Store) SetOrgStatus(ctx context.Context, o *domain.Organisation, entry domain.AuditEntry) error {
	return s.inTx(ctx, func(tx *Store) error {
		if err := tx.Organisations.UpdateStatus(ctx, o); err != nil {
			return err
		}
		return tx.AuditEvents.Record(ctx, entry)
	})
}

// RecordLoginSuccess clears the attempt counter and appends the login event atomically.
func (s *Store) RecordLoginSuccess(ctx context.Context, username string, entry domain.AuditEntry) error {
	return s.inTx(ctx, func(tx *Store) error {
		if err := tx.LoginRestrictions.RecordSuccess(ctx, username); err != nil {
			return err
		}
		return tx.AuditEvents.Record(ctx, entry)
	})
}

// RecordLoginFailure increments the attempt counter and appends the login event atomically.
func (s *Store) RecordLoginFailure(ctx context.Context, username string, threshold int, duration time.Duration, entry domain.AuditEntry) (locked bool, until *time.Time, newlyLocked bool, err error) {
	err = s.inTx(ctx, func(tx *Store) error {
		var txErr error
		locked, until, newlyLocked, txErr = tx.LoginRestrictions.RecordFailure(ctx, username, threshold, duration)
		if txErr != nil {
			return txErr
		}
		return tx.AuditEvents.Record(ctx, entry)
	})
	if err != nil {
		return false, nil, false, err
	}
	return locked, until, newlyLocked, nil
}

// ClearLoginRestriction clears a login restriction and appends its audit event atomically.
func (s *Store) ClearLoginRestriction(ctx context.Context, username string, entry domain.AuditEntry) error {
	return s.inTx(ctx, func(tx *Store) error {
		if err := tx.LoginRestrictions.AdminUnlock(ctx, username); err != nil {
			return err
		}
		return tx.AuditEvents.Record(ctx, entry)
	})
}
