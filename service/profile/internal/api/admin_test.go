package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

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

type fakeLockLookup struct {
	locked   map[string]time.Time
	unlocked string
}

func (f *fakeLockLookup) GetLockedUntil(_ context.Context, usernames []string) (map[string]time.Time, error) {
	out := map[string]time.Time{}
	for _, u := range usernames {
		if until, ok := f.locked[strings.ToLower(u)]; ok {
			out[strings.ToLower(u)] = until
		}
	}
	return out, nil
}

func (f *fakeLockLookup) AdminUnlock(_ context.Context, username string) error {
	f.unlocked = strings.ToLower(username)
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
	return userRouterWithLocks(users, &fakeLockLookup{})
}

func userRouterWithLocks(users UserAdmin, locks *fakeLockLookup) http.Handler {
	r := chi.NewRouter()
	r.Get("/", listUsers(users, locks))
	r.Post("/{id}/suspend", transitionUser(users, "suspend", domain.UserSuspended))
	r.Post("/{id}/reactivate", transitionUser(users, "reactivate", domain.UserActive))
	r.Post("/{id}/unlock", unlockUser(users, locks))
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
	user := &domain.User{ID: uuid.New(), OrgID: &orgID, Email: "member@freshmart.sg", Username: "member1"}
	fake := &fakeUserAdmin{user: user}

	rec := doAdmin(t, userRouter(fake), nil, http.MethodGet, "/?org_id="+orgID.String(), "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "member@freshmart.sg") {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body)
	}

	rec = doAdmin(t, userRouter(fake), nil, http.MethodGet, "/?org_id=not-a-uuid", "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("bad org_id: status = %d, want 400", rec.Code)
	}

	t.Run("stamps locked_until for restricted members", func(t *testing.T) {
		until := time.Now().Add(15 * time.Minute).UTC()
		locks := &fakeLockLookup{locked: map[string]time.Time{"member1": until}}
		r := chi.NewRouter()
		r.Get("/", listUsers(fake, locks))
		rec := doAdmin(t, r, nil, http.MethodGet, "/?org_id="+orgID.String(), "")
		var out []userResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatal(err)
		}
		if len(out) != 1 || out[0].LockedUntil == nil {
			t.Fatalf("expected one locked member, got %+v", out)
		}
	})
}

func TestUnlockUser(t *testing.T) {
	admin := &domain.User{ID: uuid.New(), IsAdmin: true}
	member := func() *domain.User {
		orgID := uuid.New()
		return &domain.User{ID: uuid.New(), OrgID: &orgID, Status: domain.UserActive, Username: "member1"}
	}

	t.Run("missing reason", func(t *testing.T) {
		fake := &fakeUserAdmin{user: member()}
		locks := &fakeLockLookup{}
		rec := doAdmin(t, userRouterWithLocks(fake, locks), admin,
			http.MethodPost, "/"+fake.user.ID.String()+"/unlock", `{}`)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
		if locks.unlocked != "" {
			t.Fatal("must not unlock without a reason")
		}
	})

	t.Run("unknown user", func(t *testing.T) {
		locks := &fakeLockLookup{}
		rec := doAdmin(t, userRouterWithLocks(&fakeUserAdmin{}, locks), admin,
			http.MethodPost, "/"+uuid.NewString()+"/unlock", `{"reason":"false alarm"}`)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("status = %d, want 404", rec.Code)
		}
	})

	t.Run("unlocks a restricted member", func(t *testing.T) {
		u := member()
		fake := &fakeUserAdmin{user: u}
		locks := &fakeLockLookup{}
		rec := doAdmin(t, userRouterWithLocks(fake, locks), admin,
			http.MethodPost, "/"+u.ID.String()+"/unlock", `{"reason":"verified with user"}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
		}
		if locks.unlocked != "member1" {
			t.Fatalf("unlock not applied to expected username: got %q", locks.unlocked)
		}
	})

	t.Run("idempotent: already unlocked", func(t *testing.T) {
		u := member()
		fake := &fakeUserAdmin{user: u}
		locks := &fakeLockLookup{}
		rec := doAdmin(t, userRouterWithLocks(fake, locks), admin,
			http.MethodPost, "/"+u.ID.String()+"/unlock", `{"reason":"just in case"}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200 even when already unlocked", rec.Code)
		}
	})
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
