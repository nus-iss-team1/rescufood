//go:build integration

package integration

import (
	"testing"

	"github.com/google/uuid"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

func TestUsers_UpsertBySub(t *testing.T) {
	s := newStore(t)
	org := seedOrg(t, s, func(o *domain.Organisation) {
		o.Type = domain.OrgRescuePartner
		o.Domain = "harvest.example.org"
	})

	// First sight: inserts, resolves the org by email domain.
	u, prov, err := s.Users.UpsertBySub(ctxt(), "sub-1",
		"alex@harvest.example.org", "Alex Tan", "alex", false)
	if err != nil {
		t.Fatalf("upsert: %v", err)
	}
	if !prov.Inserted {
		t.Error("first upsert should report Inserted")
	}
	if prov.OrgType != domain.OrgRescuePartner {
		t.Errorf("OrgType = %q, want rescue_partner", prov.OrgType)
	}
	if u.OrgID == nil || *u.OrgID != org.ID {
		t.Errorf("OrgID = %v, want %v", u.OrgID, org.ID)
	}

	// Second sight: updates, keeps the org, no longer inserted.
	u2, prov2, err := s.Users.UpsertBySub(ctxt(), "sub-1",
		"alex@harvest.example.org", "Alex T", "alex", true)
	if err != nil {
		t.Fatalf("re-upsert: %v", err)
	}
	if prov2.Inserted {
		t.Error("second upsert should not report Inserted")
	}
	if u2.ID != u.ID {
		t.Errorf("id changed: %v -> %v", u.ID, u2.ID)
	}
	if u2.Name != "Alex T" || !u2.IsAdmin {
		t.Errorf("update not applied: name=%q admin=%v", u2.Name, u2.IsAdmin)
	}
}

func TestUsers_UpsertBySub_NoMatchingOrg(t *testing.T) {
	s := newStore(t)
	seedOrg(t, s, func(o *domain.Organisation) { o.Domain = "known.example.org" })

	u, prov, err := s.Users.UpsertBySub(ctxt(), "sub-x",
		"nobody@unknown.example.org", "No Body", "nobody", false)
	if err != nil {
		t.Fatalf("upsert: %v", err)
	}
	if u.OrgID != nil {
		t.Errorf("OrgID = %v, want nil", u.OrgID)
	}
	if prov.OrgType != "" {
		t.Errorf("OrgType = %q, want empty", prov.OrgType)
	}
}

func TestUsers_UpsertBySub_KeepsExistingOrg(t *testing.T) {
	s := newStore(t)
	orgA := seedOrg(t, s, func(o *domain.Organisation) { o.Domain = "a.example.org" })
	seedOrg(t, s, func(o *domain.Organisation) { o.Domain = "b.example.org" })

	if _, _, err := s.Users.UpsertBySub(ctxt(), "sub-1", "u@a.example.org", "U", "u", false); err != nil {
		t.Fatalf("first: %v", err)
	}
	// Email domain now matches org B, but the user already belongs to A.
	u, _, err := s.Users.UpsertBySub(ctxt(), "sub-1", "u@b.example.org", "U", "u", false)
	if err != nil {
		t.Fatalf("second: %v", err)
	}
	if u.OrgID == nil || *u.OrgID != orgA.ID {
		t.Errorf("OrgID = %v, want %v (unchanged)", u.OrgID, orgA.ID)
	}
}

func TestUsers_ResolveCognitoSub(t *testing.T) {
	s := newStore(t)
	seedOrg(t, s, func(o *domain.Organisation) { o.Domain = "acme.example.org" })
	if _, _, err := s.Users.UpsertBySub(ctxt(), "sub-42",
		"Jamie@acme.example.org", "Jamie", "Jamie", false); err != nil {
		t.Fatalf("upsert: %v", err)
	}

	for _, id := range []string{"jamie", "JAMIE", "jamie@acme.example.org", "Jamie@ACME.example.org"} {
		sub, err := s.Users.ResolveCognitoSub(ctxt(), id)
		if err != nil {
			t.Fatalf("resolve %q: %v", id, err)
		}
		if sub != "sub-42" {
			t.Errorf("resolve %q = %q, want sub-42", id, sub)
		}
	}

	if _, err := s.Users.ResolveCognitoSub(ctxt(), "stranger"); err != domain.ErrNotFound {
		t.Errorf("resolve unknown: err = %v, want ErrNotFound", err)
	}
}

func TestUsers_IsSuspended(t *testing.T) {
	s := newStore(t)
	seedOrg(t, s, func(o *domain.Organisation) { o.Domain = "acme.example.org" })
	u, _, err := s.Users.UpsertBySub(ctxt(), "sub-1", "a@acme.example.org", "A", "aaa", false)
	if err != nil {
		t.Fatalf("upsert: %v", err)
	}

	if got, _ := s.Users.IsSuspended(ctxt(), "aaa"); got {
		t.Error("active user reported suspended")
	}

	if err := s.Users.UpdateStatus(ctxt(), u.ID, domain.UserSuspended); err != nil {
		t.Fatalf("suspend: %v", err)
	}
	if got, _ := s.Users.IsSuspended(ctxt(), "A@ACME.example.org"); !got {
		t.Error("suspended user reported active")
	}

	// An unknown identifier must not be an enumeration channel.
	if got, err := s.Users.IsSuspended(ctxt(), "ghost"); got || err != nil {
		t.Errorf("unknown identifier: suspended=%v err=%v", got, err)
	}
}

func TestUsers_ListByOrgAndUpdateStatus(t *testing.T) {
	s := newStore(t)
	org := seedOrg(t, s, func(o *domain.Organisation) { o.Domain = "acme.example.org" })
	seedOrg(t, s, func(o *domain.Organisation) { o.Domain = "other.example.org" })

	for _, sub := range []string{"s1", "s2"} {
		if _, _, err := s.Users.UpsertBySub(ctxt(), sub, sub+"@acme.example.org", sub, sub, false); err != nil {
			t.Fatalf("upsert %s: %v", sub, err)
		}
	}
	if _, _, err := s.Users.UpsertBySub(ctxt(), "s3", "s3@other.example.org", "s3", "s3", false); err != nil {
		t.Fatalf("upsert s3: %v", err)
	}

	members, err := s.Users.ListByOrg(ctxt(), org.ID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(members) != 2 {
		t.Errorf("len(members) = %d, want 2", len(members))
	}

	if err := s.Users.UpdateStatus(ctxt(), uuid.New(), domain.UserActive); err != domain.ErrNotFound {
		t.Errorf("update missing user: err = %v, want ErrNotFound", err)
	}
}
