package api

import (
	"context"
	"encoding/json"
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

func (f *fakeOrgAdmin) ListAll(_ context.Context) ([]domain.Organisation, error) {
	if f.org == nil {
		return []domain.Organisation{}, nil
	}
	return []domain.Organisation{*f.org}, nil
}

func (f *fakeOrgAdmin) CountByStatus(_ context.Context) (map[string]int, error) {
	if f.org == nil {
		return map[string]int{}, nil
	}
	return map[string]int{string(f.org.Status): 1}, nil
}

type fakeUserAdmin struct {
	user    *domain.User
	updated *domain.UserStatus
}

func (f *fakeUserAdmin) GetByID(_ context.Context, id uuid.UUID) (*domain.User, error) {
	if f.user == nil || f.user.ID != id {
		return nil, domain.ErrNotFound
	}
	copy := *f.user
	return &copy, nil
}

func (f *fakeUserAdmin) ListByOrg(_ context.Context, orgID uuid.UUID) ([]domain.User, error) {
	if f.user != nil && f.user.OrgID != nil && *f.user.OrgID == orgID {
		return []domain.User{*f.user}, nil
	}
	return []domain.User{}, nil
}

func (f *fakeUserAdmin) UpdateStatus(_ context.Context, _ uuid.UUID, status domain.UserStatus) error {
	f.updated = &status
	return nil
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

func userRouter(users UserAdmin) http.Handler {
	r := chi.NewRouter()
	r.Get("/", listUsers(users))
	r.Post("/{id}/suspend", transitionUser(users, "suspend", domain.UserSuspended))
	r.Post("/{id}/reactivate", transitionUser(users, "reactivate", domain.UserActive))
	return r
}

func TestTransitionUser(t *testing.T) {
	admin := &domain.User{ID: uuid.New(), IsAdmin: true}
	member := func() *domain.User {
		orgID := uuid.New()
		return &domain.User{ID: uuid.New(), OrgID: &orgID, Status: domain.UserActive}
	}

	t.Run("suspend active member", func(t *testing.T) {
		fake := &fakeUserAdmin{user: member()}
		rec := doAdmin(t, userRouter(fake), admin,
			http.MethodPost, "/"+fake.user.ID.String()+"/suspend", `{"reason":"abuse"}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
		}
		if fake.updated == nil || *fake.updated != domain.UserSuspended {
			t.Fatalf("status not persisted: %v", fake.updated)
		}
	})

	t.Run("cannot suspend yourself", func(t *testing.T) {
		fake := &fakeUserAdmin{user: admin}
		rec := doAdmin(t, userRouter(fake), admin,
			http.MethodPost, "/"+admin.ID.String()+"/suspend", `{"reason":"oops"}`)
		if rec.Code != http.StatusConflict {
			t.Fatalf("status = %d, want 409", rec.Code)
		}
	})

	t.Run("cannot suspend an admin", func(t *testing.T) {
		other := &domain.User{ID: uuid.New(), IsAdmin: true, Status: domain.UserActive}
		fake := &fakeUserAdmin{user: other}
		rec := doAdmin(t, userRouter(fake), admin,
			http.MethodPost, "/"+other.ID.String()+"/suspend", `{"reason":"no"}`)
		if rec.Code != http.StatusConflict {
			t.Fatalf("status = %d, want 409", rec.Code)
		}
	})

	t.Run("already suspended", func(t *testing.T) {
		u := member()
		u.Status = domain.UserSuspended
		fake := &fakeUserAdmin{user: u}
		rec := doAdmin(t, userRouter(fake), admin,
			http.MethodPost, "/"+u.ID.String()+"/suspend", `{"reason":"again"}`)
		if rec.Code != http.StatusConflict {
			t.Fatalf("status = %d, want 409", rec.Code)
		}
	})

	t.Run("reactivate suspended member", func(t *testing.T) {
		u := member()
		u.Status = domain.UserSuspended
		fake := &fakeUserAdmin{user: u}
		rec := doAdmin(t, userRouter(fake), admin,
			http.MethodPost, "/"+u.ID.String()+"/reactivate", `{"reason":"resolved"}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
	})

	t.Run("missing reason", func(t *testing.T) {
		fake := &fakeUserAdmin{user: member()}
		rec := doAdmin(t, userRouter(fake), admin,
			http.MethodPost, "/"+fake.user.ID.String()+"/suspend", `{}`)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
	})
}

func TestListUsers(t *testing.T) {
	orgID := uuid.New()
	user := &domain.User{ID: uuid.New(), OrgID: &orgID, Email: "member@freshmart.sg"}
	fake := &fakeUserAdmin{user: user}

	rec := doAdmin(t, userRouter(fake), nil, http.MethodGet, "/?org_id="+orgID.String(), "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "member@freshmart.sg") {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body)
	}

	rec = doAdmin(t, userRouter(fake), nil, http.MethodGet, "/?org_id=not-a-uuid", "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("bad org_id: status = %d, want 400", rec.Code)
	}
}

func TestCountOrgs(t *testing.T) {
	org := &domain.Organisation{ID: uuid.New(), Status: domain.OrgPending}
	rec := httptest.NewRecorder()
	countOrgs(&fakeOrgAdmin{org: org})(rec, httptest.NewRequest(http.MethodGet, "/counts", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var out map[string]int
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out["pending"] != 1 || out["approved"] != 0 || len(out) != 4 {
		t.Fatalf("counts = %v, want pending 1 and zero-filled others", out)
	}
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

	fake.org.Status = domain.OrgApproved
	rec = doAdmin(t, adminRouter(fake), nil, http.MethodGet, "/?status=all", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "Fresh Mart") {
		t.Fatalf("all: code=%d body=%s", rec.Code, rec.Body)
	}

	rec = doAdmin(t, adminRouter(fake), nil, http.MethodGet, "/?status=bogus", "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("bogus status: status = %d, want 400", rec.Code)
	}
}
