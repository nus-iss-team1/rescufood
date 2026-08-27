package store

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

type Users struct {
	db pgxDB
}

const userSelect = `
	SELECT id, cognito_sub, email, name, username, org_id, is_admin, status, created_at
	FROM users`

func (r *Users) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return scanUser(r.db.QueryRow(ctx, userSelect+` WHERE id = $1`, id))
}

func (r *Users) GetBySub(ctx context.Context, sub string) (*domain.User, error) {
	return scanUser(r.db.QueryRow(ctx, userSelect+` WHERE cognito_sub = $1`, sub))
}

// ResolveCognitoSub maps a login identifier - username or email, since
// Cognito accepts either - to the account's stable cognito_sub, so
// failed-login tracking keys on one identity regardless of which form
// the user typed. Returns domain.ErrNotFound for an identifier this
// service has never seen (no successful login yet).
func (r *Users) ResolveCognitoSub(ctx context.Context, identifier string) (string, error) {
	identifier = strings.ToLower(strings.TrimSpace(identifier))
	var sub string
	err := r.db.QueryRow(ctx,
		`SELECT cognito_sub FROM users WHERE lower(username) = $1 OR lower(email) = $1 LIMIT 1`,
		identifier).Scan(&sub)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", domain.ErrNotFound
	}
	return sub, err
}

// IsSuspended reports whether identifier (username or email) belongs to
// a suspended account. An unmatched identifier is not suspended - a
// lookup miss must behave identically to an active account, so this
// never becomes an enumeration channel.
func (r *Users) IsSuspended(ctx context.Context, identifier string) (bool, error) {
	identifier = strings.ToLower(strings.TrimSpace(identifier))
	var status string
	err := r.db.QueryRow(ctx,
		`SELECT status FROM users WHERE lower(username) = $1 OR lower(email) = $1 LIMIT 1`,
		identifier).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return domain.UserStatus(status) == domain.UserSuspended, nil
}

func (r *Users) ListByOrg(ctx context.Context, orgID uuid.UUID) ([]domain.User, error) {
	rows, err := r.db.Query(ctx, userSelect+` WHERE org_id = $1 ORDER BY created_at`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []domain.User{}
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, *u)
	}
	return users, rows.Err()
}

// UpdateStatus persists a user's status.
func (r *Users) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.UserStatus) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE users SET status = $1 WHERE id = $2`, string(status), id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// UpsertBySub creates the user on first sight and refreshes email, name,
// username and admin standing on later logins. Users without an
// organisation are attached to the one whose domain matches their email
// domain. The returned UserProvisioning reports whether this call
// inserted the row and the resolved organisation's type.
func (r *Users) UpsertBySub(ctx context.Context, sub, email, name, username string, isAdmin bool) (*domain.User, domain.UserProvisioning, error) {
	row := r.db.QueryRow(ctx, `
		WITH upsert AS (
			INSERT INTO users (cognito_sub, email, name, username, is_admin, org_id)
			VALUES ($1, $2, $3, $4, $5,
				(SELECT id FROM organisations
				 WHERE domain = $6 AND domain <> '' AND status <> 'rejected'))
			ON CONFLICT (cognito_sub) DO UPDATE SET
				email    = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE users.email END,
				name     = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE users.name END,
				username = CASE WHEN EXCLUDED.username <> '' THEN EXCLUDED.username ELSE users.username END,
				is_admin = EXCLUDED.is_admin,
				org_id   = COALESCE(users.org_id, EXCLUDED.org_id)
			RETURNING id, cognito_sub, email, name, username, org_id, is_admin, status, created_at, (xmax = 0) AS inserted
		)
		SELECT u.id, u.cognito_sub, u.email, u.name, u.username, u.org_id,
		       u.is_admin, u.status, u.created_at, u.inserted, o.type
		FROM upsert u
		LEFT JOIN organisations o ON o.id = u.org_id`,
		sub, email, name, username, isAdmin, domain.EmailDomain(email))

	var u domain.User
	var status string
	var prov domain.UserProvisioning
	var orgType *string
	err := row.Scan(&u.ID, &u.CognitoSub, &u.Email, &u.Name, &u.Username, &u.OrgID,
		&u.IsAdmin, &status, &u.CreatedAt, &prov.Inserted, &orgType)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.UserProvisioning{}, domain.ErrNotFound
	}
	if err != nil {
		return nil, domain.UserProvisioning{}, err
	}
	u.Status = domain.UserStatus(status)
	if orgType != nil {
		prov.OrgType = domain.OrgType(*orgType)
	}
	return &u, prov, nil
}

func scanUser(row pgx.Row) (*domain.User, error) {
	var u domain.User
	var status string
	err := row.Scan(&u.ID, &u.CognitoSub, &u.Email, &u.Name, &u.Username, &u.OrgID,
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
