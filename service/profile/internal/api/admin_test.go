package api

import (
	"context"
	"encoding/json"
	"errors"
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
	entries []domain.AuditEntry
}

func (f *fakeOrgAdmin) GetByID(_ context.Context, id uuid.UUID) (*domain.Organisation, error) {
	if f.org == nil || f.org.ID != id {
		return nil, domain.ErrNotFound
	}
	copy := *f.org
	return &copy, nil
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
	entries []domain.AuditEntry
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

// fakeTransitions stands in for the store's atomic change-plus-audit writes,
// applying the change to the underlying fake and keeping the entry so a test
// can assert what was recorded. err makes the audit write fail.
type fakeTransitions struct {
	orgs  *fakeOrgAdmin
	users *fakeUserAdmin
	locks *fakeLockLookup
	err   error
}

func (f *fakeTransitions) SetUserStatus(_ context.Context, _ uuid.UUID, status domain.UserStatus, entry domain.AuditEntry) error {
	if f.err != nil {
		return f.err
	}
	f.users.updated = &status
	f.users.entries = append(f.users.entries, entry)
	return nil
}

func (f *fakeTransitions) SetOrgStatus(_ context.Context, o *domain.Organisation, entry domain.AuditEntry) error {
	if f.err != nil {
		return f.err
	}
	f.orgs.org = o
	f.orgs.updated = true
	f.orgs.entries = append(f.orgs.entries, entry)
	return nil
}

func (f *fakeTransitions) ClearLoginRestriction(_ context.Context, username string, entry domain.AuditEntry) error {
	if f.err != nil {
		return f.err
	}
	f.locks.unlocked = strings.ToLower(username)
	f.users.entries = append(f.users.entries, entry)
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

type fakeMailer struct {
	to, orgName, orgID string
	calls              int
	err                error
}

func (f *fakeMailer) SendOrgApproved(_ context.Context, to, orgName, orgID string) error {
	f.to, f.orgName, f.orgID = to, orgName, orgID
	f.calls++
	return f.err
}

func adminRouter(orgs *fakeOrgAdmin, mailer Mailer) http.Handler {
	return adminRouterWithTransitions(orgs, &fakeTransitions{orgs: orgs}, mailer)
}

func adminRouterWithTransitions(orgs *fakeOrgAdmin, tr AccountTransitions, mailer Mailer) http.Handler {
	r := chi.NewRouter()
	r.Get("/", listOrgs(orgs))
	r.Post("/{id}/approve", transitionOrg(orgs, tr, "approve", domain.ActionOrgApproved, (*domain.Organisation).Approve, notifyOrgApproved(mailer)))
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
		return &domain.Organisation{ID: uuid.New(), Name: "Fresh Mart", Status: domain.OrgPending, ContactEmail: "ops@freshmart.sg"}
	}

	t.Run("approve pending", func(t *testing.T) {
		fake := &fakeOrgAdmin{org: pendingOrg()}
		mailer := &fakeMailer{}
		rec := doAdmin(t, adminRouter(fake, mailer), admin,
			http.MethodPost, "/"+fake.org.ID.String()+"/approve", `{"reason":"docs verified"}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
		}
		if !fake.updated || fake.org.Status != domain.OrgApproved {
			t.Fatalf("org not persisted as approved: %+v", fake.org)
		}
		if mailer.calls != 1 || mailer.to != "ops@freshmart.sg" || mailer.orgName != "Fresh Mart" {
			t.Fatalf("approval notification not sent as expected: %+v", mailer)
		}
	})

	t.Run("approve succeeds even if the notification publish fails", func(t *testing.T) {
		fake := &fakeOrgAdmin{org: pendingOrg()}
		mailer := &fakeMailer{err: errors.New("sqs: send message failed")}
		rec := doAdmin(t, adminRouter(fake, mailer), admin,
			http.MethodPost, "/"+fake.org.ID.String()+"/approve", `{"reason":"docs verified"}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
		}
		if fake.org.Status != domain.OrgApproved {
			t.Fatalf("org status = %s, want approved despite notify failure", fake.org.Status)
		}
	})

	t.Run("approve already approved", func(t *testing.T) {
		fake := &fakeOrgAdmin{org: pendingOrg()}
		fake.org.Status = domain.OrgApproved
		rec := doAdmin(t, adminRouter(fake, nil), admin,
			http.MethodPost, "/"+fake.org.ID.String()+"/approve", `{"reason":"again"}`)
		if rec.Code != http.StatusConflict {
			t.Fatalf("status = %d, want 409", rec.Code)
		}
	})

	t.Run("missing reason", func(t *testing.T) {
		fake := &fakeOrgAdmin{org: pendingOrg()}
		rec := doAdmin(t, adminRouter(fake, nil), admin,
			http.MethodPost, "/"+fake.org.ID.String()+"/approve", `{}`)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
		if fake.updated {
			t.Fatal("org must not be updated without a reason")
		}
	})

	t.Run("unknown org", func(t *testing.T) {
		rec := doAdmin(t, adminRouter(&fakeOrgAdmin{}, nil), admin,
			http.MethodPost, "/"+uuid.NewString()+"/approve", `{"reason":"x"}`)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("status = %d, want 404", rec.Code)
		}
	})

	t.Run("bad id", func(t *testing.T) {
		rec := doAdmin(t, adminRouter(&fakeOrgAdmin{}, nil), admin,
			http.MethodPost, "/not-a-uuid/approve", `{"reason":"x"}`)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
	})
}

func userRouter(users *fakeUserAdmin) http.Handler {
	return userRouterWithLocks(users, &fakeLockLookup{})
}

func userRouterWithLocks(users *fakeUserAdmin, locks *fakeLockLookup) http.Handler {
	return userRouterWithTransitions(users, locks,
		&fakeTransitions{users: users, locks: locks})
}

func userRouterWithTransitions(users *fakeUserAdmin, locks *fakeLockLookup, tr AccountTransitions) http.Handler {
	r := chi.NewRouter()
	r.Get("/", listUsers(users, locks))
	r.Post("/{id}/suspend", transitionUser(users, tr, "suspend", domain.ActionUserSuspended, domain.UserSuspended))
	r.Post("/{id}/reactivate", transitionUser(users, tr, "reactivate", domain.ActionUserReactivated, domain.UserActive))
	r.Post("/{id}/unlock", unlockUser(users, tr))
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
	user := &domain.User{ID: uuid.New(), OrgID: &orgID, Email: "member@freshmart.sg", CognitoSub: "sub-member1"}
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
		locks := &fakeLockLookup{locked: map[string]time.Time{"sub-member1": until}}
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
		return &domain.User{ID: uuid.New(), OrgID: &orgID, Status: domain.UserActive, CognitoSub: "sub-member1"}
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
		if locks.unlocked != "sub-member1" {
			t.Fatalf("unlock not applied to expected cognito_sub: got %q", locks.unlocked)
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

	rec := doAdmin(t, adminRouter(fake, nil), nil, http.MethodGet, "/", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Fresh Mart") {
		t.Fatalf("pending org missing from list: %s", rec.Body)
	}

	fake.org.Status = domain.OrgApproved
	rec = doAdmin(t, adminRouter(fake, nil), nil, http.MethodGet, "/?status=all", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "Fresh Mart") {
		t.Fatalf("all: code=%d body=%s", rec.Code, rec.Body)
	}

	rec = doAdmin(t, adminRouter(fake, nil), nil, http.MethodGet, "/?status=bogus", "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("bogus status: status = %d, want 400", rec.Code)
	}
}

// Actor, target, previous value, new value and reason are all retained on an
// administrative account change, and a change whose audit event cannot be
// written does not happen.
func TestAdminChangesAreAudited(t *testing.T) {
	orgID := uuid.New()
	admin := &domain.User{ID: uuid.New(), OrgID: &orgID, IsAdmin: true}

	assertEntry := func(t *testing.T, got domain.AuditEntry, action, entityType string, entityID uuid.UUID, reason string) {
		t.Helper()
		if got.Action != action {
			t.Errorf("action = %q, want %q", got.Action, action)
		}
		if got.EntityType != entityType {
			t.Errorf("entity type = %q, want %q", got.EntityType, entityType)
		}
		if got.EntityID != entityID {
			t.Errorf("entity id = %s, want %s", got.EntityID, entityID)
		}
		if got.ActorUserID != admin.ID {
			t.Errorf("actor = %s, want %s", got.ActorUserID, admin.ID)
		}
		if got.ActorOrgID == nil || *got.ActorOrgID != orgID {
			t.Errorf("actor org = %v, want %s", got.ActorOrgID, orgID)
		}
		if got.Reason != reason {
			t.Errorf("reason = %q, want %q", got.Reason, reason)
		}
	}

	assertStatusChange := func(t *testing.T, got domain.AuditEntry, previous, next string) {
		t.Helper()
		if got.Metadata["previousStatus"] != previous {
			t.Errorf("previousStatus = %v, want %q", got.Metadata["previousStatus"], previous)
		}
		if got.Metadata["newStatus"] != next {
			t.Errorf("newStatus = %v, want %q", got.Metadata["newStatus"], next)
		}
	}

	t.Run("org approval records the status it moved from", func(t *testing.T) {
		fake := &fakeOrgAdmin{org: &domain.Organisation{
			ID: uuid.New(), Name: "Fresh Mart", Status: domain.OrgPending,
			ContactEmail: "ops@freshmart.sg",
		}}
		rec := doAdmin(t, adminRouter(fake, nil), admin,
			http.MethodPost, "/"+fake.org.ID.String()+"/approve", `{"reason":"docs verified"}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
		}
		if len(fake.entries) != 1 {
			t.Fatalf("recorded %d events, want 1", len(fake.entries))
		}
		assertEntry(t, fake.entries[0], domain.ActionOrgApproved,
			domain.EntityOrganisation, fake.org.ID, "docs verified")
		assertStatusChange(t, fake.entries[0], "pending", "approved")
	})

	t.Run("user suspension records the status it moved from", func(t *testing.T) {
		memberOrg := uuid.New()
		fake := &fakeUserAdmin{user: &domain.User{
			ID: uuid.New(), OrgID: &memberOrg, Status: domain.UserActive,
		}}
		rec := doAdmin(t, userRouter(fake), admin,
			http.MethodPost, "/"+fake.user.ID.String()+"/suspend", `{"reason":"abuse report"}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
		}
		if len(fake.entries) != 1 {
			t.Fatalf("recorded %d events, want 1", len(fake.entries))
		}
		assertEntry(t, fake.entries[0], domain.ActionUserSuspended,
			domain.EntityUser, fake.user.ID, "abuse report")
		assertStatusChange(t, fake.entries[0], "active", "suspended")
	})

	t.Run("reactivation records the reverse transition", func(t *testing.T) {
		memberOrg := uuid.New()
		fake := &fakeUserAdmin{user: &domain.User{
			ID: uuid.New(), OrgID: &memberOrg, Status: domain.UserSuspended,
		}}
		rec := doAdmin(t, userRouter(fake), admin,
			http.MethodPost, "/"+fake.user.ID.String()+"/reactivate", `{"reason":"appeal upheld"}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
		}
		assertEntry(t, fake.entries[0], domain.ActionUserReactivated,
			domain.EntityUser, fake.user.ID, "appeal upheld")
		assertStatusChange(t, fake.entries[0], "suspended", "active")
	})

	t.Run("unlock is audited", func(t *testing.T) {
		memberOrg := uuid.New()
		fake := &fakeUserAdmin{user: &domain.User{
			ID: uuid.New(), OrgID: &memberOrg, Status: domain.UserActive,
			CognitoSub: "sub-member1",
		}}
		locks := &fakeLockLookup{}
		rec := doAdmin(t, userRouterWithLocks(fake, locks), admin,
			http.MethodPost, "/"+fake.user.ID.String()+"/unlock", `{"reason":"verified with user"}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
		}
		assertEntry(t, fake.entries[0], domain.ActionUserUnlocked,
			domain.EntityUser, fake.user.ID, "verified with user")
	})

	t.Run("org change fails when its event cannot be written", func(t *testing.T) {
		fake := &fakeOrgAdmin{org: &domain.Organisation{
			ID: uuid.New(), Status: domain.OrgPending, ContactEmail: "ops@freshmart.sg",
		}}
		mailer := &fakeMailer{}
		tr := &fakeTransitions{orgs: fake, err: errors.New("audit_log unavailable")}
		rec := doAdmin(t, adminRouterWithTransitions(fake, tr, mailer), admin,
			http.MethodPost, "/"+fake.org.ID.String()+"/approve", `{"reason":"docs verified"}`)
		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("status = %d, want 500", rec.Code)
		}
		if fake.updated {
			t.Error("status must not be persisted when its event cannot be")
		}
		if mailer.calls != 0 {
			t.Error("approval must not notify when the change did not happen")
		}
	})

	t.Run("user change fails when its event cannot be written", func(t *testing.T) {
		memberOrg := uuid.New()
		fake := &fakeUserAdmin{user: &domain.User{
			ID: uuid.New(), OrgID: &memberOrg, Status: domain.UserActive,
		}}
		locks := &fakeLockLookup{}
		tr := &fakeTransitions{users: fake, locks: locks, err: errors.New("audit_log unavailable")}
		rec := doAdmin(t, userRouterWithTransitions(fake, locks, tr), admin,
			http.MethodPost, "/"+fake.user.ID.String()+"/suspend", `{"reason":"abuse report"}`)
		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("status = %d, want 500", rec.Code)
		}
		if fake.updated != nil {
			t.Error("status must not be persisted when its event cannot be")
		}
	})
}
