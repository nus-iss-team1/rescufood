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
