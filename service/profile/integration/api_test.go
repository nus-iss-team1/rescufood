//go:build integration

package integration

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/api"
	"github.com/nus-iss-team1/rescufood/service/profile/internal/auth"
	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
	"github.com/nus-iss-team1/rescufood/service/profile/internal/store"
)

// testAuth stands in for auth.Middleware: it provisions the user from
// X-Test-* headers (exercising UpsertBySub) and puts it on the context.
func testAuth(s *store.Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sub := r.Header.Get("X-Test-Sub")
			if sub == "" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			user, _, err := s.Users.UpsertBySub(r.Context(), sub,
				r.Header.Get("X-Test-Email"), r.Header.Get("X-Test-Name"),
				sub, r.Header.Get("X-Test-Admin") == "true")
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
			next.ServeHTTP(w, r.WithContext(auth.WithUser(r.Context(), user)))
		})
	}
}

func newAPI(t *testing.T) (http.Handler, *store.Store) {
	t.Helper()
	resetDB(t)
	s := store.New(testPool)
	h := api.NewRouter(api.Deps{
		Logger:               slog.New(slog.NewTextHandler(io.Discard, nil)),
		Store:                s,
		Auth:                 testAuth(s),
		AllowedOrigins:       []string{"*"},
		FailedLoginThreshold: 3,
		RestrictionDuration:  time.Hour,
	})
	return h, s
}

func do(t *testing.T, h http.Handler, method, path, body string, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestAPI_RegisterOrg(t *testing.T) {
	h, s := newAPI(t)

	body := `{"name":"Fresh Mart","type":"donor","domain":"freshmart.example.org","contact_email":"ops@freshmart.example.org"}`
	rec := do(t, h, http.MethodPost, "/api/profile/orgs/register", body, nil)
	if rec.Code != http.StatusCreated {
		t.Fatalf("register: status = %d, body = %s", rec.Code, rec.Body)
	}

	org, err := s.Organisations.GetByDomain(ctxt(), "freshmart.example.org")
	if err != nil {
		t.Fatalf("org not persisted: %v", err)
	}
	if org.Status != "pending" {
		t.Errorf("status = %q, want pending", org.Status)
	}

	// Duplicate domain -> 409.
	rec = do(t, h, http.MethodPost, "/api/profile/orgs/register", body, nil)
	if rec.Code != http.StatusConflict {
		t.Errorf("duplicate: status = %d, want 409", rec.Code)
	}

	// Invalid type -> 400.
	bad := `{"name":"X","type":"bogus","domain":"x.example.org","contact_email":"x@x.example.org"}`
	rec = do(t, h, http.MethodPost, "/api/profile/orgs/register", bad, nil)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("invalid: status = %d, want 400", rec.Code)
	}
}

func TestAPI_LookupOrg(t *testing.T) {
	h, _ := newAPI(t)
	// Not registered.
	rec := do(t, h, http.MethodGet, "/api/profile/orgs/lookup?domain=nobody.example.org", "", nil)
	var out map[string]bool
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out["registered"] || out["approved"] {
		t.Errorf("unknown domain: %v", out)
	}

	do(t, h, http.MethodPost, "/api/profile/orgs/register",
		`{"name":"Acme","type":"donor","domain":"acme.example.org","contact_email":"a@acme.example.org"}`, nil)
	rec = do(t, h, http.MethodGet, "/api/profile/orgs/lookup?domain=ACME.example.org", "", nil)
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if !out["registered"] || out["approved"] {
		t.Errorf("registered pending org: %v", out)
	}
}

func TestAPI_Me_ProvisionsUserAndResolvesOrg(t *testing.T) {
	h, _ := newAPI(t)
	seedOrg(t, store.New(testPool), func(o *domain.Organisation) { o.Domain = "acme.example.org" })

	rec := do(t, h, http.MethodGet, "/api/profile/me", "", map[string]string{
		"X-Test-Sub":   "sub-1",
		"X-Test-Email": "alex@acme.example.org",
		"X-Test-Name":  "Alex",
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("me: status = %d, body = %s", rec.Code, rec.Body)
	}
	var me struct {
		Email string `json:"email"`
		Org   *struct {
			Domain string `json:"domain"`
		} `json:"org"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &me)
	if me.Org == nil || me.Org.Domain != "acme.example.org" {
		t.Errorf("org not resolved: %+v", me)
	}

	// No auth header -> 401.
	if rec := do(t, h, http.MethodGet, "/api/profile/me", "", nil); rec.Code != http.StatusUnauthorized {
		t.Errorf("no auth: status = %d, want 401", rec.Code)
	}
}

func TestAPI_AdminApproveOrg(t *testing.T) {
	h, s := newAPI(t)
	org := seedOrg(t, s, func(o *domain.Organisation) {
		o.Domain = "pending.example.org"
		o.Status = domain.OrgPending
	})

	approve := `{"reason":"verified against ACRA"}`

	// Non-admin -> 403.
	rec := do(t, h, http.MethodPost, "/api/profile/admin/orgs/"+org.ID.String()+"/approve", approve, map[string]string{
		"X-Test-Sub": "member", "X-Test-Email": "m@pending.example.org",
	})
	if rec.Code != http.StatusForbidden {
		t.Errorf("non-admin: status = %d, want 403", rec.Code)
	}

	// Admin -> 200, org approved.
	rec = do(t, h, http.MethodPost, "/api/profile/admin/orgs/"+org.ID.String()+"/approve", approve, map[string]string{
		"X-Test-Sub": "boss", "X-Test-Email": "boss@x.example.org", "X-Test-Admin": "true",
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("approve: status = %d, body = %s", rec.Code, rec.Body)
	}
	reloaded, _ := s.Organisations.GetByID(ctxt(), org.ID)
	if reloaded.Status != "approved" {
		t.Errorf("status = %q, want approved", reloaded.Status)
	}
}

func TestAPI_LoginLockout(t *testing.T) {
	h, _ := newAPI(t)
	fail := `{"username":"victim","success":false}`

	for i := 0; i < 3; i++ {
		if rec := do(t, h, http.MethodPost, "/api/profile/auth/login-outcome", fail, nil); rec.Code != http.StatusNoContent {
			t.Fatalf("failure %d: status = %d", i, rec.Code)
		}
	}

	rec := do(t, h, http.MethodGet, "/api/profile/auth/login-status?username=victim", "", nil)
	var out struct {
		Restricted bool `json:"restricted"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if !out.Restricted {
		t.Errorf("login-status after 3 failures: %s", rec.Body)
	}

	// Success clears it.
	do(t, h, http.MethodPost, "/api/profile/auth/login-outcome", `{"username":"victim","success":true}`, nil)
	rec = do(t, h, http.MethodGet, "/api/profile/auth/login-status?username=victim", "", nil)
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.Restricted {
		t.Errorf("still restricted after success: %s", rec.Body)
	}
}
