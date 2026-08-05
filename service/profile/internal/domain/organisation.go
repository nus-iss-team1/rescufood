package domain

import (
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
)

type OrgType string

type OrgStatus string

const (
	OrgDonor         OrgType = "donor"
	OrgRescuePartner OrgType = "rescue_partner"

	OrgPending   OrgStatus = "pending"
	OrgApproved  OrgStatus = "approved"
	OrgRejected  OrgStatus = "rejected"
	OrgSuspended OrgStatus = "suspended"
)

type Organisation struct {
	ID           uuid.UUID
	Name         string
	Type         OrgType
	Status       OrgStatus
	Domain       string
	Description  string
	ContactEmail string
	ContactPhone string
	Address      string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type NewOrganisationParams struct {
	Name         string
	Type         OrgType
	Domain       string
	Description  string
	ContactEmail string
	ContactPhone string
	Address      string
}

// publicEmailDomains cannot be claimed as an organisation domain.
var publicEmailDomains = map[string]bool{
	"gmail.com":   true,
	"yahoo.com":   true,
	"hotmail.com": true,
	"outlook.com": true,
	"icloud.com":  true,
}

// EmailDomain returns the lowercased domain part of email, or "".
func EmailDomain(email string) string {
	i := strings.LastIndex(email, "@")
	if i < 0 || i == len(email)-1 {
		return ""
	}
	return strings.ToLower(email[i+1:])
}

// NewOrganisation validates p and returns a pending organisation.
func NewOrganisation(p NewOrganisationParams) (*Organisation, error) {
	name := strings.TrimSpace(p.Name)
	if len(name) < 2 || len(name) > 100 {
		return nil, fmt.Errorf("%w: name must be 2-100 characters", ErrValidation)
	}
	if p.Type != OrgDonor && p.Type != OrgRescuePartner {
		return nil, fmt.Errorf("%w: unknown organisation type %q", ErrValidation, p.Type)
	}
	if _, err := mail.ParseAddress(p.ContactEmail); err != nil {
		return nil, fmt.Errorf("%w: invalid contact email", ErrValidation)
	}
	dom := strings.ToLower(strings.TrimSpace(p.Domain))
	if dom == "" {
		return nil, fmt.Errorf("%w: email domain is required", ErrValidation)
	}
	if strings.ContainsAny(dom, "@ /") || !strings.Contains(dom, ".") {
		return nil, fmt.Errorf("%w: domain must look like example.org", ErrValidation)
	}
	if publicEmailDomains[dom] {
		return nil, fmt.Errorf("%w: public email domains cannot be claimed", ErrValidation)
	}
	now := time.Now().UTC()
	return &Organisation{
		ID:           uuid.New(),
		Name:         name,
		Type:         p.Type,
		Status:       OrgPending,
		Domain:       dom,
		Description:  strings.TrimSpace(p.Description),
		ContactEmail: p.ContactEmail,
		ContactPhone: strings.TrimSpace(p.ContactPhone),
		Address:      strings.TrimSpace(p.Address),
		CreatedAt:    now,
		UpdatedAt:    now,
	}, nil
}

// Approve transitions a pending or suspended organisation to approved.
func (o *Organisation) Approve() error {
	if o.Status != OrgPending && o.Status != OrgSuspended {
		return ErrInvalidTransition
	}
	o.setStatus(OrgApproved)
	return nil
}

// Reject transitions a pending organisation to rejected.
func (o *Organisation) Reject() error {
	if o.Status != OrgPending {
		return ErrInvalidTransition
	}
	o.setStatus(OrgRejected)
	return nil
}

// Suspend transitions an approved organisation to suspended.
func (o *Organisation) Suspend() error {
	if o.Status != OrgApproved {
		return ErrInvalidTransition
	}
	o.setStatus(OrgSuspended)
	return nil
}

func (o *Organisation) setStatus(s OrgStatus) {
	o.Status = s
	o.UpdatedAt = time.Now().UTC()
}
