package store

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

type Users struct {
	db pgxDB
}

const userSelect = `
	SELECT id, cognito_sub, email, name, org_id, is_admin, status, created_at
	FROM users`

func (r *Users) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return scanUser(r.db.QueryRow(ctx, userSelect+` WHERE id = $1`, id))
}

func (r *Users) GetBySub(ctx context.Context, sub string) (*domain.User, error) {
	return scanUser(r.db.QueryRow(ctx, userSelect+` WHERE cognito_sub = $1`, sub))
}

// UpsertBySub creates the user on first sight and refreshes email on
// later logins.
func (r *Users) UpsertBySub(ctx context.Context, sub, email, name string) (*domain.User, error) {
	return scanUser(r.db.QueryRow(ctx, `
		INSERT INTO users (cognito_sub, email, name)
		VALUES ($1, $2, $3)
		ON CONFLICT (cognito_sub) DO UPDATE
			SET email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE users.email END
		RETURNING id, cognito_sub, email, name, org_id, is_admin, status, created_at`,
		sub, email, name))
}

func scanUser(row pgx.Row) (*domain.User, error) {
	var u domain.User
	var status string
	err := row.Scan(&u.ID, &u.CognitoSub, &u.Email, &u.Name, &u.OrgID,
		&u.IsAdmin, &status, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	u.Status = domain.UserStatus(status)
	return &u, nil
}
