package domain

import "errors"

var (
	ErrValidation        = errors.New("validation failed")
	ErrInvalidTransition = errors.New("invalid status transition")
	ErrNotFound          = errors.New("not found")
	ErrAlreadyInOrg      = errors.New("user already belongs to an organisation")
	ErrNameTaken         = errors.New("organisation name already taken")
	ErrDomainTaken       = errors.New("organisation domain already claimed")
)
