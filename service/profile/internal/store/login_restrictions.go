package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// LoginRestrictions tracks failed-login counters and temporary
// restrictions, keyed by the Cognito login username (case-insensitive,
// so lookups are normalized before every query).
type LoginRestrictions struct {
	db pgxDB
}

func normalizeUsername(username string) string {
	return strings.ToLower(strings.TrimSpace(username))
}

// Check reports whether username is currently restricted.
func (r *LoginRestrictions) Check(ctx context.Context, username string) (bool, *time.Time, error) {
	var until time.Time
	err := r.db.QueryRow(ctx, `
		SELECT locked_until FROM login_restrictions
		WHERE username = $1 AND locked_until > now()`,
		normalizeUsername(username)).Scan(&until)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil, nil
	}
	if err != nil {
		return false, nil, err
	}
	return true, &until, nil
}

// RecordFailure increments the failed-attempt counter and, once it
// reaches threshold, sets locked_until to now()+duration. newlyLocked
// reports whether this call is the one that crossed the threshold.
func (r *LoginRestrictions) RecordFailure(ctx context.Context, username string, threshold int, duration time.Duration) (locked bool, until *time.Time, newlyLocked bool, err error) {
	var failedCount int
	var lockedUntil *time.Time
	row := r.db.QueryRow(ctx, `
		INSERT INTO login_restrictions (username, failed_count, updated_at)
		VALUES ($1, 1, now())
		ON CONFLICT (username) DO UPDATE SET
			failed_count = login_restrictions.failed_count + 1,
			locked_until = CASE
				WHEN login_restrictions.failed_count + 1 >= $2
					THEN now() + make_interval(secs => $3)
				ELSE login_restrictions.locked_until
			END,
			updated_at = now()
		RETURNING failed_count, locked_until`,
		normalizeUsername(username), threshold, duration.Seconds())
	if err := row.Scan(&failedCount, &lockedUntil); err != nil {
		return false, nil, false, err
	}
	locked = lockedUntil != nil && lockedUntil.After(time.Now())
	newlyLocked = failedCount == threshold
	return locked, lockedUntil, newlyLocked, nil
}

// RecordSuccess clears the failed-attempt counter and any restriction
// after a successful authentication.
func (r *LoginRestrictions) RecordSuccess(ctx context.Context, username string) error {
	return r.clear(ctx, username)
}

// AdminUnlock clears a restriction on an administrator's say-so. Clearing
// a counter that is already zero is not an error.
func (r *LoginRestrictions) AdminUnlock(ctx context.Context, username string) error {
	return r.clear(ctx, username)
}

func (r *LoginRestrictions) clear(ctx context.Context, username string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE login_restrictions SET failed_count = 0, locked_until = NULL, updated_at = now()
		WHERE username = $1`,
		normalizeUsername(username))
	return err
}

// GetLockedUntil returns the currently-restricted usernames among the
// given list, mapped to their locked_until time.
func (r *LoginRestrictions) GetLockedUntil(ctx context.Context, usernames []string) (map[string]time.Time, error) {
	normalized := make([]string, len(usernames))
	for i, u := range usernames {
		normalized[i] = normalizeUsername(u)
	}
	rows, err := r.db.Query(ctx, `
		SELECT username, locked_until FROM login_restrictions
		WHERE username = ANY($1) AND locked_until > now()`, normalized)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[string]time.Time{}
	for rows.Next() {
		var username string
		var until time.Time
		if err := rows.Scan(&username, &until); err != nil {
			return nil, err
		}
		out[username] = until
	}
	return out, rows.Err()
}
