//go:build integration

package integration

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

func TestOrganisations_Create_UniqueViolations(t *testing.T) {
	s := newStore(t)
	first := seedOrg(t, s, func(o *domain.Organisation) {
		o.Name = "Fresh Mart"
		o.Domain = "freshmart.example.org"
	})

	sameName := &domain.Organisation{
		ID: uuid.New(), Name: first.Name, Type: domain.OrgDonor,
		Status: domain.OrgPending, Domain: "other.example.org",
		ContactEmail: "x@other.example.org",
		CreatedAt:    time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}
	if err := s.Organisations.Create(ctxt(), sameName); err != domain.ErrNameTaken {
		t.Errorf("duplicate name: err = %v, want ErrNameTaken", err)
	}

	sameDomain := &domain.Organisation{
		ID: uuid.New(), Name: "Different", Type: domain.OrgDonor,
		Status: domain.OrgPending, Domain: first.Domain,
		ContactEmail: "x@freshmart.example.org",
		CreatedAt:    time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}
	if err := s.Organisations.Create(ctxt(), sameDomain); err != domain.ErrDomainTaken {
		t.Errorf("duplicate domain: err = %v, want ErrDomainTaken", err)
	}
}

func TestOrganisations_Create_EmptyDomainNotUnique(t *testing.T) {
	s := newStore(t)
	// The domain unique index is partial (WHERE domain <> ''), so two
	// orgs with no domain are allowed.
	seedOrg(t, s, func(o *domain.Organisation) { o.Name = "A"; o.Domain = "" })
	err := s.Organisations.Create(ctxt(), &domain.Organisation{
		ID: uuid.New(), Name: "B", Type: domain.OrgDonor, Status: domain.OrgPending,
		Domain: "", ContactEmail: "b@b.example.org",
		CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	})
	if err != nil {
		t.Errorf("second empty-domain org: %v", err)
	}
}

func TestOrganisations_GetAndList(t *testing.T) {
	s := newStore(t)
	approved := seedOrg(t, s, func(o *domain.Organisation) { o.Domain = "a.example.org" })
	seedOrg(t, s, func(o *domain.Organisation) {
		o.Domain = "b.example.org"
		o.Status = domain.OrgPending
	})

	got, err := s.Organisations.GetByID(ctxt(), approved.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.Name != approved.Name || got.Status != domain.OrgApproved {
		t.Errorf("GetByID = %+v", got)
	}

	byDomain, err := s.Organisations.GetByDomain(ctxt(), "b.example.org")
	if err != nil {
		t.Fatalf("GetByDomain: %v", err)
	}
	if byDomain.Status != domain.OrgPending {
		t.Errorf("GetByDomain status = %q", byDomain.Status)
	}

	if _, err := s.Organisations.GetByID(ctxt(), uuid.New()); err != domain.ErrNotFound {
		t.Errorf("GetByID missing: err = %v, want ErrNotFound", err)
	}

	pending, err := s.Organisations.List(ctxt(), domain.OrgPending)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(pending) != 1 || pending[0].Domain != "b.example.org" {
		t.Errorf("List(pending) = %+v", pending)
	}

	all, err := s.Organisations.ListAll(ctxt())
	if err != nil {
		t.Fatalf("ListAll: %v", err)
	}
	if len(all) != 2 {
		t.Errorf("len(ListAll) = %d, want 2", len(all))
	}

	counts, err := s.Organisations.CountByStatus(ctxt())
	if err != nil {
		t.Fatalf("CountByStatus: %v", err)
	}
	if counts["approved"] != 1 || counts["pending"] != 1 {
		t.Errorf("counts = %v", counts)
	}
}

func TestOrganisations_UpdateStatus(t *testing.T) {
	s := newStore(t)
	org := seedOrg(t, s, func(o *domain.Organisation) {
		o.Domain = "a.example.org"
		o.Status = domain.OrgPending
	})

	if err := org.Approve(); err != nil {
		t.Fatalf("Approve: %v", err)
	}
	if err := s.Organisations.UpdateStatus(ctxt(), org); err != nil {
		t.Fatalf("UpdateStatus: %v", err)
	}
	reloaded, _ := s.Organisations.GetByID(ctxt(), org.ID)
	if reloaded.Status != domain.OrgApproved {
		t.Errorf("status = %q, want approved", reloaded.Status)
	}

	missing := &domain.Organisation{ID: uuid.New(), Status: domain.OrgApproved, UpdatedAt: time.Now().UTC()}
	if err := s.Organisations.UpdateStatus(ctxt(), missing); err != domain.ErrNotFound {
		t.Errorf("UpdateStatus missing: err = %v, want ErrNotFound", err)
	}
}
