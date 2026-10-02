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
	ActionLoginSucceeded  = "auth.login_succeeded"
	ActionLoginFailed     = "auth.login_failed"
)

// Audit entity types this service writes.
const (
	EntityUser         = "user"
	EntityOrganisation = "organisation"
)

// LoginSubject is the account a login identifier names.
type LoginSubject struct {
	UserID     uuid.UUID
	OrgID      *uuid.UUID
	CognitoSub string
}

// AuditEntry is one row appended to audit_log; a zero id is stored as NULL.
type AuditEntry struct {
	ActorUserID uuid.UUID
	ActorOrgID  *uuid.UUID
	Action      string
	EntityType  string
	EntityID    uuid.UUID
	// Subject names what was attempted against when there is no record to point at.
	Subject  string
	Reason   string
	Metadata map[string]any
}

// StatusChange returns the previous and new value of a status transition.
func StatusChange(previous, next string) map[string]any {
	return map[string]any{"previousStatus": previous, "newStatus": next}
}

// RequestContext returns a login event's where-from metadata, omitting absent values.
func RequestContext(ipAddress, userAgent string) map[string]any {
	m := map[string]any{}
	if ipAddress != "" {
		m["ipAddress"] = ipAddress
	}
	if userAgent != "" {
		m["userAgent"] = userAgent
	}
	return m
}
