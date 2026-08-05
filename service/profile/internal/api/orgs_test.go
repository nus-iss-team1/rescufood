package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/auth"
	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

type fakeOrgCreator struct {
	err  error
	org  *domain.Organisation
	seen bool
}

func (f *fakeOrgCreator) CreateOrganisationWithOwner(_ context.Context, org *domain.Organisation, _ uuid.UUID) error {
	f.seen = true
	f.org = org
	return f.err
}

func doCreateOrg(t *testing.T, user *domain.User, body string, creator OrgCreator) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/orgs", strings.NewReader(body))
	if user != nil {
		req = req.WithContext(auth.WithUser(req.Context(), user))
	}
	rec := httptest.NewRecorder()
	createOrg(creator)(rec, req)
	return rec
}

const validBody = `{
	"name": "Fresh Mart",
	"type": "donor",
	"contact_email": "ops@freshmart.sg"
}`

func TestCreateOrg(t *testing.T) {
	activeUser := func() *domain.User {
		return &domain.User{ID: uuid.New(), Status: domain.UserActive}
	}

	t.Run("created", func(t *testing.T) {
		fake := &fakeOrgCreator{}
		rec := doCreateOrg(t, activeUser(), validBody, fake)
		if rec.Code != http.StatusCreated {
			t.Fatalf("status = %d, want 201; body: %s", rec.Code, rec.Body)
		}
		if !fake.seen {
			t.Fatal("store was never called")
		}
		if fake.org.Status != domain.OrgPending {
			t.Fatalf("org status = %s, want pending", fake.org.Status)
		}
	})

	t.Run("no user in context", func(t *testing.T) {
		rec := doCreateOrg(t, nil, validBody, &fakeOrgCreator{})
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want 401", rec.Code)
		}
	})

	t.Run("user already in org", func(t *testing.T) {
		u := activeUser()
		orgID := uuid.New()
		u.OrgID = &orgID
		fake := &fakeOrgCreator{}
		rec := doCreateOrg(t, u, validBody, fake)
		if rec.Code != http.StatusConflict {
			t.Fatalf("status = %d, want 409", rec.Code)
		}
		if fake.seen {
			t.Fatal("store must not be called")
		}
	})

	t.Run("malformed json", func(t *testing.T) {
		rec := doCreateOrg(t, activeUser(), `{"name":`, &fakeOrgCreator{})
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
	})

	t.Run("validation failure", func(t *testing.T) {
		rec := doCreateOrg(t, activeUser(), `{"name":"x","type":"donor","contact_email":"ops@freshmart.sg"}`, &fakeOrgCreator{})
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
	})

	t.Run("name taken", func(t *testing.T) {
		fake := &fakeOrgCreator{err: domain.ErrNameTaken}
		rec := doCreateOrg(t, activeUser(), validBody, fake)
		if rec.Code != http.StatusConflict {
			t.Fatalf("status = %d, want 409", rec.Code)
		}
	})
}
