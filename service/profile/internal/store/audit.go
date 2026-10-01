package store

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

// AuditEvents appends to audit_log. That table is created and migrated by
// service/listings (drizzle), which lives in the same physical database; this
// service writes authentication and account-administration events to it so a
// change and its audit row commit in one transaction. Append-only: no update
// or delete method exists here, and the table rejects both (listings
// migration 0018).
type AuditEvents struct {
	db pgxDB
}

// Record appends one event. A zero EntityID or empty Subject is stored as
// NULL rather than a zero value, so "no subject" is not confused with one.
func (r *AuditEvents) Record(ctx context.Context, e domain.AuditEntry) error {
	metadata := e.Metadata
	if metadata == nil {
		metadata = map[string]any{}
	}
	encoded, err := json.Marshal(metadata)
	if err != nil {
		return err
	}

	var entityID any
	if e.EntityID != uuid.Nil {
		entityID = e.EntityID
	}
	var subject any
	if e.Subject != "" {
		subject = e.Subject
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO audit_log
			(user_id, org_id, action, entity_type, entity_id, subject, reason, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		e.ActorUserID, e.ActorOrgID, e.Action, e.EntityType, entityID, subject,
		e.Reason, encoded)
	return err
}
