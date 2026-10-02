package domain

import "github.com/google/uuid"

// Audit action names this service writes. `<entity>.<event>`. Keep in sync
// with ProfileAuditAction in service/listings/src/audit/audit.actions.ts.
const (
	ActionUserSuspended   = "user.suspended"
	ActionUserReactivated = "user.reactivated"
	ActionUserUnlocked    = "user.unlocked"
	ActionOrgApproved     = "organisation.approved"
	ActionOrgRejected     = "organisation.rejected"
	ActionOrgSuspended    = "organisation.suspended"
)

// Audit entity types this service writes.
const (
	EntityUser         = "user"
	EntityOrganisation = "organisation"
)

// AuditEntry is one row appended to audit_log. Actor is the administrator
// who made the change; Entity is what was changed.
type AuditEntry struct {
	ActorUserID uuid.UUID
	ActorOrgID  *uuid.UUID
	Action      string
	EntityType  string
	EntityID    uuid.UUID
	// Subject names what an event was attempted against when it has no
	// record to point at - a failed login on an unknown username.
	Subject  string
	Reason   string
	Metadata map[string]any
}

// StatusChange returns the metadata AC2 requires: what the value was and
// what it became.
func StatusChange(previous, next string) map[string]any {
	return map[string]any{"previousStatus": previous, "newStatus": next}
}
