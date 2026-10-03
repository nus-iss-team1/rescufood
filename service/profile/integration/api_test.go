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

// Crossing the failed-login threshold is retained as its own event, in the
// same transaction as the attempt that caused it.
func TestAPI_LockoutIsAudited(t *testing.T) {
	h, _ := newAPI(t) // newAPI sets FailedLoginThreshold to 3
	attempt := `{"username":"victim","success":false,"forwarded_for":"203.0.113.7"}`

	for i := 0; i < 3; i++ {
		if rec := do(t, h, http.MethodPost, "/api/profile/auth/login-outcome", attempt, nil); rec.Code != http.StatusNoContent {
			t.Fatalf("attempt %d: status = %d, body = %s", i, rec.Code, rec.Body)
		}
	}

	counts := map[string]int{}
	rows, err := testPool.Query(ctxt(), `SELECT action FROM audit_log`)
	if err != nil {
		t.Fatal(err)
	}
	for rows.Next() {
		var a string
		if err := rows.Scan(&a); err != nil {
			t.Fatal(err)
		}
		counts[a]++
	}
	rows.Close()

	if counts[domain.ActionLoginFailed] != 3 || counts[domain.ActionAccountLocked] != 1 || len(counts) != 2 {
		t.Fatalf("events = %v, want 3 failed attempts and 1 lockout", counts)
	}

	// The lockout commits with the attempt that caused it, so created_at -
	// transaction-start time - is identical, not merely close.
	var sameInstant bool
	if err := testPool.QueryRow(ctxt(), `
		SELECT (SELECT created_at FROM audit_log WHERE action = $1)
		     = (SELECT max(created_at) FROM audit_log WHERE action = $2)`,
		domain.ActionAccountLocked, domain.ActionLoginFailed).Scan(&sameInstant); err != nil {
		t.Fatal(err)
	}
	if !sameInstant {
		t.Error("lockout must commit in the same transaction as the attempt that tripped it")
	}

	var subject *string
	var metadata map[string]any
	if err := testPool.QueryRow(ctxt(),
		`SELECT subject, metadata FROM audit_log WHERE action = $1`,
		domain.ActionAccountLocked).Scan(&subject, &metadata); err != nil {
		t.Fatalf("lockout event not retained: %v", err)
	}
	if subject == nil || *subject != "victim" {
		t.Errorf("subject = %v, want the identifier as typed", subject)
	}
	if metadata["lockedUntil"] == nil {
		t.Error("lockout event must record how long the restriction lasts")
	}
	if metadata["ipAddress"] != "203.0.113.7" {
		t.Errorf("ipAddress = %v, want it carried from the attempt", metadata["ipAddress"])
	}
}

// A completed password reset is retained against a real database, and the
// restriction it clears is cleared in the same transaction.
func TestAPI_PasswordResetIsAudited(t *testing.T) {
	h, s := newAPI(t)
	org := seedOrg(t, s)
	user, _, err := s.Users.UpsertBySub(ctxt(), "sub-alice",
		"alice@"+org.Domain, "Alice Tan", "alice", false)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	// Lock the account first, so the reset has a restriction to clear.
	for i := 0; i < 3; i++ {
		do(t, h, http.MethodPost, "/api/profile/auth/login-outcome",
			`{"username":"alice","success":false}`, nil)
	}

	body := `{"username":"alice","forwarded_for":"203.0.113.7","user_agent":"curl/8"}`
	if rec := do(t, h, http.MethodPost, "/api/profile/auth/password-reset-completed", body, nil); rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
	}

	var (
		entityID *uuid.UUID
		subject  *string
		metadata map[string]any
	)
	if err := testPool.QueryRow(ctxt(), `
		SELECT entity_id, subject, metadata FROM audit_log WHERE action = $1`,
		domain.ActionPasswordReset).Scan(&entityID, &subject, &metadata); err != nil {
		t.Fatalf("password reset not retained: %v", err)
	}
	if entityID == nil || *entityID != user.ID {
		t.Errorf("entity_id = %v, want %s", entityID, user.ID)
	}
	if subject == nil || *subject != "alice" {
		t.Errorf("subject = %v", subject)
	}
	if metadata["ipAddress"] != "203.0.113.7" || metadata["userAgent"] != "curl/8" {
		t.Errorf("request context not retained: %v", metadata)
	}

	// The reset lifted the lockout.
	rec := do(t, h, http.MethodGet, "/api/profile/auth/login-status?username=alice", "", nil)
	var out struct {
		Restricted bool `json:"restricted"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.Restricted {
		t.Errorf("still restricted after a completed reset: %s", rec.Body)
	}
}

// Actor names resolve by id, so an actor whose audit event carries no
// organisation still gets a name - which is the whole point of the endpoint.
func TestAPI_UserNames(t *testing.T) {
	h, s := newAPI(t)
	org := seedOrg(t, s)

	named, _, err := s.Users.UpsertBySub(ctxt(), "sub-named",
		"alice@"+org.Domain, "Alice Tan", "alice", false)
	if err != nil {
		t.Fatalf("seed named user: %v", err)
	}
	// No display name, so the email has to stand in.
	unnamed, _, err := s.Users.UpsertBySub(ctxt(), "sub-unnamed",
		"bob@"+org.Domain, "", "bob", false)
	if err != nil {
		t.Fatalf("seed unnamed user: %v", err)
	}

	get := func(t *testing.T, ids string) map[string]string {
		t.Helper()
		rec := do(t, h, http.MethodGet, "/api/profile/admin/users/names?ids="+ids, "",
			map[string]string{"X-Test-Sub": "boss", "X-Test-Email": "boss@x.example.org", "X-Test-Admin": "true"})
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
		}
		var out []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatal(err)
		}
		got := map[string]string{}
		for _, n := range out {
			got[n.ID] = n.Name
		}
		return got
	}

	t.Run("resolves names and falls back to the email", func(t *testing.T) {
		got := get(t, named.ID.String()+","+unnamed.ID.String())
		if got[named.ID.String()] != "Alice Tan" {
			t.Errorf("named = %q, want Alice Tan", got[named.ID.String()])
		}
		if got[unnamed.ID.String()] != "bob@"+org.Domain {
			t.Errorf("unnamed = %q, want the email", got[unnamed.ID.String()])
		}
	})

	t.Run("an id with no user is absent", func(t *testing.T) {
		ghost := uuid.NewString()
		got := get(t, named.ID.String()+","+ghost)
		if _, present := got[ghost]; present {
			t.Error("an unknown id must not appear in the result")
		}
		if len(got) != 1 {
			t.Errorf("got %d names, want 1", len(got))
		}
	})

	t.Run("a non-admin is refused", func(t *testing.T) {
		rec := do(t, h, http.MethodGet,
			"/api/profile/admin/users/names?ids="+named.ID.String(), "",
			map[string]string{"X-Test-Sub": "member", "X-Test-Email": "m@" + org.Domain})
		if rec.Code != http.StatusForbidden {
			t.Fatalf("status = %d, want 403", rec.Code)
		}
	})

	t.Run("every actor in the audit log can be named", func(t *testing.T) {
		// The failure this endpoint exists to fix: an audit event with no
		// org_id, whose actor the org-scoped lookup could never resolve.
		if _, err := testPool.Exec(ctxt(), `
			INSERT INTO audit_log (user_id, org_id, action, entity_type, entity_id)
			VALUES ($1, NULL, 'claim.created', 'claim', $2)`,
			named.ID, uuid.New()); err != nil {
			t.Fatal(err)
		}

		var actor string
		if err := testPool.QueryRow(ctxt(),
			`SELECT user_id::text FROM audit_log WHERE org_id IS NULL AND user_id IS NOT NULL`).
			Scan(&actor); err != nil {
			t.Fatal(err)
		}
		if got := get(t, actor); got[actor] != "Alice Tan" {
			t.Errorf("orgless event's actor = %q, want Alice Tan", got[actor])
		}
	})
}
