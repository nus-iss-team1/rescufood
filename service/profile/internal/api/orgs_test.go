package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

type fakeOrgRegistrar struct {
	err  error
	org  *domain.Organisation
	seen bool
}

func (f *fakeOrgRegistrar) Create(_ context.Context, org *domain.Organisation) error {
	f.seen = true
	if f.err != nil {
		return f.err
	}
	f.org = org
	return nil
}

func (f *fakeOrgRegistrar) GetByDomain(_ context.Context, dom string) (*domain.Organisation, error) {
	if f.org == nil || f.org.Domain != dom {
		return nil, domain.ErrNotFound
	}
	return f.org, nil
}

func doRegisterOrg(t *testing.T, body string, orgs OrgRegistrar) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/orgs/register", strings.NewReader(body))
	rec := httptest.NewRecorder()
	registerOrg(orgs)(rec, req)
	return rec
}

const validBody = `{
	"name": "Fresh Mart",
	"type": "donor",
	"domain": "freshmart.sg",
	"contact_email": "ops@freshmart.sg"
}`

func TestRegisterOrg(t *testing.T) {
	t.Run("created pending", func(t *testing.T) {
		fake := &fakeOrgRegistrar{}
		rec := doRegisterOrg(t, validBody, fake)
		if rec.Code != http.StatusCreated {
			t.Fatalf("status = %d, want 201; body: %s", rec.Code, rec.Body)
		}
		if fake.org.Status != domain.OrgPending {
			t.Fatalf("org status = %s, want pending", fake.org.Status)
		}
	})

	t.Run("missing domain", func(t *testing.T) {
		fake := &fakeOrgRegistrar{}
		rec := doRegisterOrg(t, `{"name":"Fresh Mart","type":"donor","contact_email":"ops@freshmart.sg"}`, fake)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
		if fake.seen {
			t.Fatal("store must not be called")
		}
	})

	t.Run("malformed json", func(t *testing.T) {
		rec := doRegisterOrg(t, `{"name":`, &fakeOrgRegistrar{})
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
	})

	t.Run("domain taken", func(t *testing.T) {
		rec := doRegisterOrg(t, validBody, &fakeOrgRegistrar{err: domain.ErrDomainTaken})
		if rec.Code != http.StatusConflict {
			t.Fatalf("status = %d, want 409", rec.Code)
		}
	})
}

func TestLookupOrg(t *testing.T) {
	lookup := func(t *testing.T, orgs OrgRegistrar, query string) (int, map[string]bool) {
		t.Helper()
		req := httptest.NewRequest(http.MethodGet, "/orgs/lookup"+query, nil)
		rec := httptest.NewRecorder()
		lookupOrg(orgs)(rec, req)
		var out map[string]bool
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		return rec.Code, out
	}

	org := &domain.Organisation{Domain: "freshmart.sg", Status: domain.OrgPending}
	fake := &fakeOrgRegistrar{org: org}

	t.Run("pending org", func(t *testing.T) {
		code, out := lookup(t, fake, "?domain=freshmart.sg")
		if code != http.StatusOK || !out["registered"] || out["approved"] {
			t.Fatalf("code=%d out=%v, want registered, not approved", code, out)
		}
	})

	t.Run("approved org", func(t *testing.T) {
		org.Status = domain.OrgApproved
		code, out := lookup(t, fake, "?domain=FreshMart.SG")
		if code != http.StatusOK || !out["approved"] {
			t.Fatalf("code=%d out=%v, want approved (case-insensitive)", code, out)
		}
	})

	t.Run("unknown domain", func(t *testing.T) {
		code, out := lookup(t, fake, "?domain=nowhere.sg")
		if code != http.StatusOK || out["registered"] {
			t.Fatalf("code=%d out=%v, want unregistered", code, out)
		}
	})

	t.Run("missing param", func(t *testing.T) {
		code, _ := lookup(t, fake, "")
		if code != http.StatusBadRequest {
			t.Fatalf("code = %d, want 400", code)
		}
	})
}
