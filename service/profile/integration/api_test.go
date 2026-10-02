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

	"github.com/google/uuid"

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

	// The change and its audit event commit together, so the row is there by
	// the time the response is.
	var (
		action     string
		entityType string
		reason     string
		metadata   map[string]any
		actorEmail string
	)
	err := testPool.QueryRow(ctxt(), `
		SELECT a.action, a.entity_type, a.reason, a.metadata, u.email
		FROM audit_log a JOIN users u ON u.id = a.user_id
		WHERE a.entity_id = $1`, org.ID).
		Scan(&action, &entityType, &reason, &metadata, &actorEmail)
	if err != nil {
		t.Fatalf("no audit event retained for the approval: %v", err)
	}
	if action != "organisation.approved" || entityType != "organisation" {
		t.Errorf("action = %q, entity_type = %q", action, entityType)
	}
	if reason != "verified against ACRA" {
		t.Errorf("reason = %q, want the reason given on the request", reason)
	}
	if actorEmail != "boss@x.example.org" {
		t.Errorf("actor = %q, want the admin who approved", actorEmail)
	}
	if metadata["previousStatus"] != "pending" || metadata["newStatus"] != "approved" {
		t.Errorf("metadata = %v, want pending -> approved", metadata)
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

// A login attempt is retained with its time, subject, outcome and request
// context, against a real database and through the real HTTP handler.
func TestAPI_LoginAttemptsAreAudited(t *testing.T) {
	h, s := newAPI(t)
	org := seedOrg(t, s)
	user, _, err := s.Users.UpsertBySub(ctxt(), "sub-alice",
		"alice@"+org.Domain, "Alice Tan", "alice", false)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	type event struct {
		action     string
		entityType string
		entityID   *uuid.UUID
		subject    *string
		userID     *uuid.UUID
		metadata   map[string]any
		createdAt  time.Time
	}
	latest := func(t *testing.T) event {
		t.Helper()
		var e event
		err := testPool.QueryRow(ctxt(), `
			SELECT action, entity_type, entity_id, subject, user_id, metadata, created_at
			FROM audit_log ORDER BY created_at DESC, id DESC LIMIT 1`).
			Scan(&e.action, &e.entityType, &e.entityID, &e.subject, &e.userID, &e.metadata, &e.createdAt)
		if err != nil {
			t.Fatalf("no audit event retained: %v", err)
		}
		return e
	}

	t.Run("a known account's success names that account", func(t *testing.T) {
		body := `{"username":"alice","success":true,"forwarded_for":"203.0.113.9","user_agent":"Mozilla/5.0 (probe)"}`
		if rec := do(t, h, http.MethodPost, "/api/profile/auth/login-outcome", body, nil); rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
		}

		e := latest(t)
		if e.action != domain.ActionLoginSucceeded || e.entityType != domain.EntityUser {
			t.Errorf("action = %q, entity_type = %q", e.action, e.entityType)
		}
		if e.entityID == nil || *e.entityID != user.ID {
			t.Errorf("entity_id = %v, want %s", e.entityID, user.ID)
		}
		if e.userID == nil || *e.userID != user.ID {
			t.Errorf("user_id = %v, want %s", e.userID, user.ID)
		}
		if e.subject == nil || *e.subject != "alice" {
			t.Errorf("subject = %v, want the identifier as typed", e.subject)
		}
		if e.metadata["ipAddress"] != "203.0.113.9" {
			t.Errorf("ipAddress = %v", e.metadata["ipAddress"])
		}
		if e.metadata["userAgent"] != "Mozilla/5.0 (probe)" {
			t.Errorf("userAgent = %v", e.metadata["userAgent"])
		}
		if time.Since(e.createdAt) > time.Minute {
			t.Errorf("created_at = %s, want roughly now", e.createdAt)
		}
	})

	t.Run("an unknown username is retained by subject with no account", func(t *testing.T) {
		body := `{"username":"ghost@example.invalid","success":false,"forwarded_for":"198.51.100.4"}`
		if rec := do(t, h, http.MethodPost, "/api/profile/auth/login-outcome", body, nil); rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
		}

		e := latest(t)
		if e.action != domain.ActionLoginFailed {
			t.Errorf("action = %q, want %q", e.action, domain.ActionLoginFailed)
		}
		// This is what nullable entity_id and the subject column are for.
		if e.entityID != nil || e.userID != nil {
			t.Errorf("unknown account must leave entity_id and user_id NULL: entity=%v user=%v", e.entityID, e.userID)
		}
		if e.subject == nil || *e.subject != "ghost@example.invalid" {
			t.Errorf("subject = %v", e.subject)
		}
	})

	t.Run("a password in the body never reaches the event", func(t *testing.T) {
		body := `{"username":"alice","success":false,"password":"hunter2"}`
		if rec := do(t, h, http.MethodPost, "/api/profile/auth/login-outcome", body, nil); rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d", rec.Code)
		}
		var n int
		if err := testPool.QueryRow(ctxt(),
			`SELECT count(*)::int FROM audit_log WHERE metadata::text LIKE '%hunter2%' OR subject LIKE '%hunter2%' OR reason LIKE '%hunter2%'`).
			Scan(&n); err != nil {
			t.Fatal(err)
		}
		if n != 0 {
			t.Fatalf("%d events contain the password", n)
		}
	})

	t.Run("the retained event cannot be rewritten afterwards", func(t *testing.T) {
		if _, err := testPool.Exec(ctxt(),
			`UPDATE audit_log SET action = 'tampered' WHERE action = $1`,
			domain.ActionLoginSucceeded); err == nil {
			t.Fatal("expected the append-only trigger to reject the update")
		}
	})
}
