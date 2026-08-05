package store

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

type Organisations struct {
	db pgxDB
}

func (r *Organisations) Create(ctx context.Context, o *domain.Organisation) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO organisations
			(id, name, type, status, description, contact_email,
			 contact_phone, address, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		o.ID, o.Name, string(o.Type), string(o.Status), o.Description,
		o.ContactEmail, o.ContactPhone, o.Address, o.CreatedAt, o.UpdatedAt)
	return err
}

func (r *Organisations) GetByID(ctx context.Context, id uuid.UUID) (*domain.Organisation, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, name, type, status, description, contact_email,
		       contact_phone, address, created_at, updated_at
		FROM organisations WHERE id = $1`, id)

	var o domain.Organisation
	var typ, status string
	err := row.Scan(&o.ID, &o.Name, &typ, &status, &o.Description,
		&o.ContactEmail, &o.ContactPhone, &o.Address,
		&o.CreatedAt, &o.UpdatedAt)
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
