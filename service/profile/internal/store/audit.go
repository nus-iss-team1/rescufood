package store

import (
	"context"

	"github.com/google/uuid"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

// AuditEvents appends to audit_log, the append-only table service/listings owns.
type AuditEvents struct {
	db pgxDB
}

// Record appends one event, storing a zero id or empty subject as NULL.
func (r *AuditEvents) Record(ctx context.Context, e domain.AuditEntry) error {
	metadata := e.Metadata
	if metadata == nil {
		metadata = map[string]any{}
	}

	// user_id and entity_id are FKs, so an absent id must be NULL, not zero.
	var actorUserID any
	if e.ActorUserID != uuid.Nil {
		actorUserID = e.ActorUserID
	}
	var entityID any
	if e.EntityID != uuid.Nil {
		entityID = e.EntityID
	}
	var subject any
	if e.Subject != "" {
		subject = e.Subject
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO audit_log
			(user_id, org_id, action, entity_type, entity_id, subject, reason, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		actorUserID, e.ActorOrgID, e.Action, e.EntityType, entityID, subject,
		e.Reason, metadata)
	return err
}
