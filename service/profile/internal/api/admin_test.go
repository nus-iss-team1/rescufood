package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/auth"
	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

type fakeOrgAdmin struct {
	org     *domain.Organisation
	updated bool
}

func (f *fakeOrgAdmin) GetByID(_ context.Context, id uuid.UUID) (*domain.Organisation, error) {
	if f.org == nil || f.org.ID != id {
		return nil, domain.ErrNotFound
	}
	copy := *f.org
	return &copy, nil
}

func (f *fakeOrgAdmin) UpdateStatus(_ context.Context, o *domain.Organisation) error {
	f.org = o
	f.updated = true
	return nil
}

func (f *fakeOrgAdmin) List(_ context.Context, status domain.OrgStatus) ([]domain.Organisation, error) {
	if f.org != nil && f.org.Status == status {
		return []domain.Organisation{*f.org}, nil
	}
	return []domain.Organisation{}, nil
}

func adminRouter(orgs OrgAdmin) http.Handler {
	r := chi.NewRouter()
	r.Get("/", listOrgs(orgs))
	r.Post("/{id}/approve", transitionOrg(orgs, "approve", (*domain.Organisation).Approve))
	return r
}

func doAdmin(t *testing.T, h http.Handler, user *domain.User, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if user != nil {
		req = req.WithContext(auth.WithUser(req.Context(), user))
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestRequireAdmin(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	h := requireAdmin(next)

	rec := doAdmin(t, h, &domain.User{ID: uuid.New()}, http.MethodGet, "/", "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("non-admin: status = %d, want 403", rec.Code)
	}

	rec = doAdmin(t, h, &domain.User{ID: uuid.New(), IsAdmin: true}, http.MethodGet, "/", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("admin: status = %d, want 200", rec.Code)
	}
}

func TestTransitionOrg(t *testing.T) {
	admin := &domain.User{ID: uuid.New(), IsAdmin: true}
	pendingOrg := func() *domain.Organisation {
		return &domain.Organisation{ID: uuid.New(), Name: "Fresh Mart", Status: domain.OrgPending}
	}

	t.Run("approve pending", func(t *testing.T) {
		fake := &fakeOrgAdmin{org: pendingOrg()}
		rec := doAdmin(t, adminRouter(fake), admin,
			http.MethodPost, "/"+fake.org.ID.String()+"/approve", `{"reason":"docs verified"}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
		}
		if !fake.updated || fake.org.Status != domain.OrgApproved {
			t.Fatalf("org not persisted as approved: %+v", fake.org)
		}
	})

	t.Run("approve already approved", func(t *testing.T) {
		fake := &fakeOrgAdmin{org: pendingOrg()}
		fake.org.Status = domain.OrgApproved
		rec := doAdmin(t, adminRouter(fake), admin,
			http.MethodPost, "/"+fake.org.ID.String()+"/approve", `{"reason":"again"}`)
		if rec.Code != http.StatusConflict {
			t.Fatalf("status = %d, want 409", rec.Code)
		}
	})

	t.Run("missing reason", func(t *testing.T) {
		fake := &fakeOrgAdmin{org: pendingOrg()}
		rec := doAdmin(t, adminRouter(fake), admin,
			http.MethodPost, "/"+fake.org.ID.String()+"/approve", `{}`)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
		if fake.updated {
			t.Fatal("org must not be updated without a reason")
		}
	})

	t.Run("unknown org", func(t *testing.T) {
		rec := doAdmin(t, adminRouter(&fakeOrgAdmin{}), admin,
			http.MethodPost, "/"+uuid.NewString()+"/approve", `{"reason":"x"}`)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("status = %d, want 404", rec.Code)
		}
	})

	t.Run("bad id", func(t *testing.T) {
		rec := doAdmin(t, adminRouter(&fakeOrgAdmin{}), admin,
			http.MethodPost, "/not-a-uuid/approve", `{"reason":"x"}`)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
	})
}

func TestListOrgs(t *testing.T) {
	org := &domain.Organisation{ID: uuid.New(), Name: "Fresh Mart", Status: domain.OrgPending}
	fake := &fakeOrgAdmin{org: org}

	rec := doAdmin(t, adminRouter(fake), nil, http.MethodGet, "/", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Fresh Mart") {
		t.Fatalf("pending org missing from list: %s", rec.Body)
	}

	rec = doAdmin(t, adminRouter(fake), nil, http.MethodGet, "/?status=bogus", "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("bogus status: status = %d, want 400", rec.Code)
	}
}
