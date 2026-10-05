package domain

import (
	"time"

	"github.com/google/uuid"
)

type UserStatus string

const (
	UserActive    UserStatus = "active"
	UserSuspended UserStatus = "suspended"
)

type User struct {
	ID         uuid.UUID
	CognitoSub string
	Email      string
	Name       string
	Username   string
	OrgID      *uuid.UUID
	IsAdmin    bool
	Status     UserStatus
	CreatedAt  time.Time
}

// UserName is a user's id and how to display them, for callers that hold ids
// and need labels - the audit log's actors, for one.
type UserName struct {
	ID   uuid.UUID
	Name string
}

// UserProvisioning reports the outcome of UpsertBySub: whether the row
// was newly inserted and the type of the organisation it resolved to
// (empty when the user has no organisation).
type UserProvisioning struct {
	Inserted bool
	OrgType  OrgType
}
