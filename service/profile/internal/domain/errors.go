package domain

import "errors"

var (
	ErrValidation        = errors.New("validation failed")
	ErrInvalidTransition = errors.New("invalid status transition")
	ErrNotFound          = errors.New("not found")
	ErrNameTaken         = errors.New("organisation name already taken")
	ErrDomainTaken       = errors.New("organisation domain already claimed")
)
