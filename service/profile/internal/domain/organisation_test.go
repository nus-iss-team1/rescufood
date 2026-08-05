package domain

import (
	"errors"
	"testing"
)

func validParams() NewOrganisationParams {
	return NewOrganisationParams{
		Name:         "Fresh Mart",
		Type:         OrgDonor,
		Domain:       "freshmart.sg",
		ContactEmail: "ops@freshmart.sg",
	}
}

func TestNewOrganisation(t *testing.T) {
	cases := []struct {
		name    string
		mutate  func(*NewOrganisationParams)
		wantErr bool
	}{
		{"valid", func(p *NewOrganisationParams) {}, false},
		{"name too short", func(p *NewOrganisationParams) { p.Name = "x" }, true},
		{"name only spaces", func(p *NewOrganisationParams) { p.Name = "   " }, true},
		{"unknown type", func(p *NewOrganisationParams) { p.Type = "supplier" }, true},
		{"bad email", func(p *NewOrganisationParams) { p.ContactEmail = "not-an-email" }, true},
		{"uppercase domain ok", func(p *NewOrganisationParams) { p.Domain = "FreshMart.SG" }, false},
		{"missing domain", func(p *NewOrganisationParams) { p.Domain = "" }, true},
		{"domain with @", func(p *NewOrganisationParams) { p.Domain = "ops@freshmart.sg" }, true},
		{"domain without dot", func(p *NewOrganisationParams) { p.Domain = "freshmart" }, true},
		{"public email domain", func(p *NewOrganisationParams) { p.Domain = "gmail.com" }, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			p := validParams()
			tc.mutate(&p)
			org, err := NewOrganisation(p)
			if tc.wantErr {
				if !errors.Is(err, ErrValidation) {
					t.Fatalf("want ErrValidation, got %v", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if org.Status != OrgPending {
				t.Fatalf("new organisation must start pending, got %s", org.Status)
			}
		})
	}
}

func TestOrganisationTransitions(t *testing.T) {
	cases := []struct {
		name    string
		from    OrgStatus
		call    func(*Organisation) error
		want    OrgStatus
		wantErr bool
	}{
		{"approve pending", OrgPending, (*Organisation).Approve, OrgApproved, false},
		{"approve suspended", OrgSuspended, (*Organisation).Approve, OrgApproved, false},
		{"approve approved", OrgApproved, (*Organisation).Approve, OrgApproved, true},
		{"approve rejected", OrgRejected, (*Organisation).Approve, OrgRejected, true},
		{"reject pending", OrgPending, (*Organisation).Reject, OrgRejected, false},
		{"reject approved", OrgApproved, (*Organisation).Reject, OrgApproved, true},
		{"reject suspended", OrgSuspended, (*Organisation).Reject, OrgSuspended, true},
		{"suspend approved", OrgApproved, (*Organisation).Suspend, OrgSuspended, false},
		{"suspend pending", OrgPending, (*Organisation).Suspend, OrgPending, true},
		{"suspend rejected", OrgRejected, (*Organisation).Suspend, OrgRejected, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			org := &Organisation{Status: tc.from}
			err := tc.call(org)
			if tc.wantErr && !errors.Is(err, ErrInvalidTransition) {
				t.Fatalf("want ErrInvalidTransition, got %v", err)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if org.Status != tc.want {
				t.Fatalf("status = %s, want %s", org.Status, tc.want)
			}
		})
	}
}
