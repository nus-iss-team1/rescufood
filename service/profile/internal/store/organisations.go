package store

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

type Organisations struct {
	db pgxDB
}

const orgColumns = `id, name, type, status, domain, description, contact_email,
	contact_phone, address, created_at, updated_at`

func (r *Organisations) Create(ctx context.Context, o *domain.Organisation) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO organisations (`+orgColumns+`)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		o.ID, o.Name, string(o.Type), string(o.Status), o.Domain, o.Description,
		o.ContactEmail, o.ContactPhone, o.Address, o.CreatedAt, o.UpdatedAt)

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.UniqueViolation {
		if pgErr.ConstraintName == "organisations_domain_uq" {
			return domain.ErrDomainTaken
		}
		return domain.ErrNameTaken
	}
	return err
}

func (r *Organisations) GetByID(ctx context.Context, id uuid.UUID) (*domain.Organisation, error) {
	return scanOrg(r.db.QueryRow(ctx,
		`SELECT `+orgColumns+` FROM organisations WHERE id = $1`, id))
}

func (r *Organisations) GetByDomain(ctx context.Context, dom string) (*domain.Organisation, error) {
	return scanOrg(r.db.QueryRow(ctx,
		`SELECT `+orgColumns+` FROM organisations WHERE domain = $1`, dom))
}

// List returns up to 100 organisations in the given status, oldest first.
func (r *Organisations) List(ctx context.Context, status domain.OrgStatus) ([]domain.Organisation, error) {
	return r.collect(ctx, `
		SELECT `+orgColumns+` FROM organisations
		WHERE status = $1 ORDER BY created_at LIMIT 100`, string(status))
}

// ListAll returns up to 100 organisations of any status, oldest first.
func (r *Organisations) ListAll(ctx context.Context) ([]domain.Organisation, error) {
	return r.collect(ctx, `
		SELECT `+orgColumns+` FROM organisations ORDER BY created_at LIMIT 100`)
}

func (r *Organisations) collect(ctx context.Context, sql string, args ...any) ([]domain.Organisation, error) {
	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orgs := []domain.Organisation{}
	for rows.Next() {
		o, err := scanOrg(rows)
		if err != nil {
			return nil, err
		}
		orgs = append(orgs, *o)
	}
	return orgs, rows.Err()
}

// CountByStatus returns how many organisations are in each status.
func (r *Organisations) CountByStatus(ctx context.Context) (map[string]int, error) {
	rows, err := r.db.Query(ctx,
		`SELECT status, count(*) FROM organisations GROUP BY status`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := map[string]int{}
	for rows.Next() {
		var status string
		var n int
		if err := rows.Scan(&status, &n); err != nil {
			return nil, err
		}
		counts[status] = n
	}
	return counts, rows.Err()
}

// UpdateStatus persists o's status and updated_at.
func (r *Organisations) UpdateStatus(ctx context.Context, o *domain.Organisation) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE organisations SET status = $1, updated_at = $2 WHERE id = $3`,
		string(o.Status), o.UpdatedAt, o.ID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func scanOrg(row pgx.Row) (*domain.Organisation, error) {
	var o domain.Organisation
	var typ, status string
	err := row.Scan(&o.ID, &o.Name, &typ, &status, &o.Domain, &o.Description,
		&o.ContactEmail, &o.ContactPhone, &o.Address, &o.CreatedAt, &o.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	o.Type = domain.OrgType(typ)
	o.Status = domain.OrgStatus(status)
	return &o, nil
}
