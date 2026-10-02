package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

// fakeSubjectResolver maps known identifiers (username or email) to a
// cognito_sub, mirroring store.Users.ResolveCognitoSub. An unmapped
// identifier reports domain.ErrNotFound, same as an account this
// service has never seen authenticate successfully.
type fakeSubjectResolver map[string]string

func (f fakeSubjectResolver) ResolveCognitoSub(_ context.Context, identifier string) (string, error) {
	if sub, ok := f[strings.ToLower(identifier)]; ok {
		return sub, nil
	}
	return "", domain.ErrNotFound
}

// fakeUserID derives a stable uuid from a cognito_sub, so a test can assert
// which account a login event names.
func fakeUserID(sub string) uuid.UUID {
	return uuid.NewSHA1(uuid.Nil, []byte(sub))
}

func (f fakeSubjectResolver) ResolveLoginSubject(_ context.Context, identifier string) (*domain.LoginSubject, error) {
	sub, ok := f[strings.ToLower(identifier)]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return &domain.LoginSubject{UserID: fakeUserID(sub), CognitoSub: sub}, nil
}

type fakeLoginAttempts struct {
	restricted  bool
	until       *time.Time
	failures    map[string]int
	successes   map[string]bool
	threshold   int
	newlyLocked bool
	// entries holds the audit events recorded alongside each attempt;
	// auditErr makes the audit write fail, which must fail the whole attempt.
	entries  []domain.AuditEntry
	auditErr error
}

// RecordLoginSuccess / RecordLoginFailure stand in for the store's atomic
// counter-plus-audit writes. When auditErr is set, the counter is left
// untouched - which is what a rolled-back transaction looks like.
func (f *fakeLoginAttempts) RecordLoginSuccess(ctx context.Context, username string, entry domain.AuditEntry) error {
	if f.auditErr != nil {
		return f.auditErr
	}
	f.entries = append(f.entries, entry)
	return f.RecordSuccess(ctx, username)
}

func (f *fakeLoginAttempts) RecordLoginFailure(ctx context.Context, username string, threshold int, d time.Duration, entry domain.AuditEntry) (bool, *time.Time, bool, error) {
	if f.auditErr != nil {
		return false, nil, false, f.auditErr
	}
	f.entries = append(f.entries, entry)
	return f.RecordFailure(ctx, username, threshold, d)
}

func (f *fakeLoginAttempts) lastEntry() domain.AuditEntry {
	if len(f.entries) == 0 {
		return domain.AuditEntry{}
	}
	return f.entries[len(f.entries)-1]
}

func (f *fakeLoginAttempts) Check(_ context.Context, username string) (bool, *time.Time, error) {
	return f.restricted, f.until, nil
}

func (f *fakeLoginAttempts) RecordFailure(_ context.Context, username string, threshold int, _ time.Duration) (bool, *time.Time, bool, error) {
	if f.failures == nil {
		f.failures = map[string]int{}
	}
	f.failures[username]++
	newlyLocked := f.failures[username] == threshold
	f.newlyLocked = newlyLocked
	if newlyLocked {
		until := time.Now().Add(15 * time.Minute)
		f.until = &until
		f.restricted = true
	}
	return f.restricted, f.until, newlyLocked, nil
}

func (f *fakeLoginAttempts) RecordSuccess(_ context.Context, username string) error {
	if f.successes == nil {
		f.successes = map[string]bool{}
	}
	f.successes[username] = true
	f.restricted = false
	f.until = nil
	return nil
}

// fakeSuspensionChecker reports the given identifiers (lowercased) as
// suspended; anything else is treated as not suspended.
type fakeSuspensionChecker map[string]bool

func (f fakeSuspensionChecker) IsSuspended(_ context.Context, identifier string) (bool, error) {
	return f[strings.ToLower(identifier)], nil
}

func authRouter(attempts *fakeLoginAttempts, threshold int, duration time.Duration) http.Handler {
	return authRouterWithResolver(attempts, fakeSubjectResolver{}, threshold, duration)
}

func authRouterWithResolver(attempts *fakeLoginAttempts, resolver fakeSubjectResolver, threshold int, duration time.Duration) http.Handler {
	return authRouterFull(attempts, resolver, fakeSuspensionChecker{}, threshold, duration)
}

func authRouterFull(attempts *fakeLoginAttempts, resolver fakeSubjectResolver, suspended fakeSuspensionChecker, threshold int, duration time.Duration) http.Handler {
	r := chi.NewRouter()
	r.Get("/login-status", loginStatus(attempts, resolver))
	r.Post("/login-outcome", loginOutcome(attempts, resolver, threshold, duration))
	r.Post("/password-reset-completed", passwordResetCompleted(attempts, resolver))
	r.Get("/reset-eligibility", resetEligibility(suspended))
	return r
}

func doAuth(t *testing.T, h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestLoginStatus(t *testing.T) {
	t.Run("missing username", func(t *testing.T) {
		rec := doAuth(t, authRouter(&fakeLoginAttempts{}, 5, 15*time.Minute), http.MethodGet, "/login-status", "")
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
	})

	t.Run("not restricted", func(t *testing.T) {
		rec := doAuth(t, authRouter(&fakeLoginAttempts{}, 5, 15*time.Minute), http.MethodGet, "/login-status?username=alice", "")
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		if strings.Contains(rec.Body.String(), `"restricted":true`) {
			t.Fatalf("expected not restricted: %s", rec.Body)
		}
	})

	t.Run("restricted", func(t *testing.T) {
		until := time.Now().Add(time.Minute)
		rec := doAuth(t, authRouter(&fakeLoginAttempts{restricted: true, until: &until}, 5, 15*time.Minute),
			http.MethodGet, "/login-status?username=alice", "")
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"restricted":true`) {
			t.Fatalf("code=%d body=%s", rec.Code, rec.Body)
		}
	})
}

func TestLoginOutcome(t *testing.T) {
	t.Run("missing username", func(t *testing.T) {
		rec := doAuth(t, authRouter(&fakeLoginAttempts{}, 5, 15*time.Minute),
			http.MethodPost, "/login-outcome", `{"success":true}`)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
	})

	t.Run("bad json", func(t *testing.T) {
		rec := doAuth(t, authRouter(&fakeLoginAttempts{}, 5, 15*time.Minute),
			http.MethodPost, "/login-outcome", `not json`)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
	})

	t.Run("success resets counter", func(t *testing.T) {
		fake := &fakeLoginAttempts{}
		rec := doAuth(t, authRouter(fake, 5, 15*time.Minute),
			http.MethodPost, "/login-outcome", `{"username":"alice","success":true}`)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204", rec.Code)
		}
		if !fake.successes["alice"] {
			t.Fatal("success not recorded")
		}
	})

	t.Run("failure below threshold does not lock", func(t *testing.T) {
		fake := &fakeLoginAttempts{}
		rec := doAuth(t, authRouter(fake, 5, 15*time.Minute),
			http.MethodPost, "/login-outcome", `{"username":"alice","success":false}`)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204", rec.Code)
		}
		if fake.restricted {
			t.Fatal("must not restrict before threshold")
		}
	})

	t.Run("failure crossing threshold locks", func(t *testing.T) {
		fake := &fakeLoginAttempts{}
		var rec *httptest.ResponseRecorder
		for i := 0; i < 3; i++ {
			rec = doAuth(t, authRouter(fake, 3, 15*time.Minute),
				http.MethodPost, "/login-outcome", `{"username":"bob","success":false}`)
		}
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204", rec.Code)
		}
		if !fake.restricted {
			t.Fatal("expected account to be restricted after crossing threshold")
		}
		if !fake.newlyLocked {
			t.Fatal("expected the crossing call to report newlyLocked")
		}
	})

	t.Run("username and email alias for the same account share one counter", func(t *testing.T) {
		fake := &fakeLoginAttempts{}
		resolver := fakeSubjectResolver{
			"carol":             "sub-carol",
			"carol@example.com": "sub-carol",
		}
		router := authRouterWithResolver(fake, resolver, 3, 15*time.Minute)

		doAuth(t, router, http.MethodPost, "/login-outcome", `{"username":"carol","success":false}`)
		doAuth(t, router, http.MethodPost, "/login-outcome", `{"username":"Carol@example.com","success":false}`)
		if fake.restricted {
			t.Fatal("only 2 of 3 failures recorded, must not be restricted yet")
		}
		doAuth(t, router, http.MethodPost, "/login-outcome", `{"username":"carol","success":false}`)
		if !fake.restricted {
			t.Fatal("expected the shared cognito_sub counter to cross the threshold")
		}
		if fake.failures["sub-carol"] != 3 {
			t.Fatalf("expected all 3 failures recorded under the resolved sub, got %v", fake.failures)
		}
	})
}

func TestPasswordResetCompleted(t *testing.T) {
	t.Run("missing username", func(t *testing.T) {
		rec := doAuth(t, authRouter(&fakeLoginAttempts{}, 5, 15*time.Minute),
			http.MethodPost, "/password-reset-completed", `{}`)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
	})

	t.Run("records the event and clears any lockout", func(t *testing.T) {
		fake := &fakeLoginAttempts{restricted: true}
		rec := doAuth(t, authRouter(fake, 5, 15*time.Minute),
			http.MethodPost, "/password-reset-completed", `{"username":"alice"}`)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204", rec.Code)
		}
		if !fake.successes["alice"] {
			t.Fatal("expected RecordSuccess to be called, clearing the lockout")
		}
		if fake.restricted {
			t.Fatal("expected the lockout to be cleared")
		}
	})
}

func TestResetEligibility(t *testing.T) {
	suspended := fakeSuspensionChecker{"suspendedbob": true}

	t.Run("missing identifier", func(t *testing.T) {
		rec := doAuth(t, authRouterFull(&fakeLoginAttempts{}, fakeSubjectResolver{}, suspended, 5, 15*time.Minute),
			http.MethodGet, "/reset-eligibility", "")
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
	})

	t.Run("suspended account is not eligible", func(t *testing.T) {
		rec := doAuth(t, authRouterFull(&fakeLoginAttempts{}, fakeSubjectResolver{}, suspended, 5, 15*time.Minute),
			http.MethodGet, "/reset-eligibility?identifier=suspendedBob", "")
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"eligible":false`) {
			t.Fatalf("code=%d body=%s", rec.Code, rec.Body)
		}
	})

	t.Run("active and unknown accounts are eligible", func(t *testing.T) {
		for _, identifier := range []string{"alice", "unknown-person"} {
			rec := doAuth(t, authRouterFull(&fakeLoginAttempts{}, fakeSubjectResolver{}, suspended, 5, 15*time.Minute),
				http.MethodGet, "/reset-eligibility?identifier="+identifier, "")
			if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"eligible":true`) {
				t.Fatalf("identifier=%s: code=%d body=%s", identifier, rec.Code, rec.Body)
			}
		}
	})
}

// A login attempt records time, subject, outcome and the available request
// context, and never the password.
func TestLoginOutcomeIsAudited(t *testing.T) {
	const threshold = 5
	known := fakeSubjectResolver{"alice": "sub-alice", "alice@example.org": "sub-alice"}

	t.Run("success names the account and keeps the request context", func(t *testing.T) {
		fake := &fakeLoginAttempts{}
		rec := doAuth(t, authRouterWithResolver(fake, known, threshold, 15*time.Minute),
			http.MethodPost, "/login-outcome",
			`{"username":"alice","success":true,"forwarded_for":"203.0.113.7","user_agent":"Mozilla/5.0 (probe)"}`)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204; body: %s", rec.Code, rec.Body)
		}

		got := fake.lastEntry()
		if got.Action != domain.ActionLoginSucceeded {
			t.Errorf("action = %q, want %q", got.Action, domain.ActionLoginSucceeded)
		}
		if got.EntityType != domain.EntityUser {
			t.Errorf("entity type = %q, want %q", got.EntityType, domain.EntityUser)
		}
		if got.EntityID != fakeUserID("sub-alice") || got.ActorUserID != fakeUserID("sub-alice") {
			t.Errorf("event does not name the resolved account: entity=%s actor=%s", got.EntityID, got.ActorUserID)
		}
		if got.Subject != "alice" {
			t.Errorf("subject = %q, want the identifier as typed", got.Subject)
		}
		if got.Metadata["ipAddress"] != "203.0.113.7" {
			t.Errorf("ipAddress = %v", got.Metadata["ipAddress"])
		}
		if got.Metadata["userAgent"] != "Mozilla/5.0 (probe)" {
			t.Errorf("userAgent = %v", got.Metadata["userAgent"])
		}
	})

	t.Run("failure against an unknown username still records the attempt", func(t *testing.T) {
		fake := &fakeLoginAttempts{}
		rec := doAuth(t, authRouterWithResolver(fake, known, threshold, 15*time.Minute),
			http.MethodPost, "/login-outcome",
			`{"username":"nobody@example.invalid","success":false,"forwarded_for":"198.51.100.3"}`)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204; body: %s", rec.Code, rec.Body)
		}

		got := fake.lastEntry()
		if got.Action != domain.ActionLoginFailed {
			t.Errorf("action = %q, want %q", got.Action, domain.ActionLoginFailed)
		}
		// No account to point at - these must stay zero so they store as NULL.
		if got.EntityID != uuid.Nil || got.ActorUserID != uuid.Nil {
			t.Errorf("unknown account must leave the id columns unset: entity=%s actor=%s", got.EntityID, got.ActorUserID)
		}
		if got.Subject != "nobody@example.invalid" {
			t.Errorf("subject = %q, want the identifier as typed", got.Subject)
		}
	})

	t.Run("a password in the body is never retained", func(t *testing.T) {
		fake := &fakeLoginAttempts{}
		rec := doAuth(t, authRouterWithResolver(fake, known, threshold, 15*time.Minute),
			http.MethodPost, "/login-outcome",
			`{"username":"alice","success":true,"password":"hunter2","user_agent":"curl/8"}`)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204", rec.Code)
		}
		got := fake.lastEntry()
		for key, value := range got.Metadata {
			if s, ok := value.(string); ok && strings.Contains(s, "hunter2") {
				t.Fatalf("metadata[%s] leaked the password: %q", key, s)
			}
		}
		if strings.Contains(got.Subject, "hunter2") || strings.Contains(got.Reason, "hunter2") {
			t.Fatal("password leaked into the event")
		}
	})

	t.Run("an unwritable event fails the attempt and leaves the counter alone", func(t *testing.T) {
		fake := &fakeLoginAttempts{auditErr: errors.New("audit_log unavailable")}
		rec := doAuth(t, authRouterWithResolver(fake, known, threshold, 15*time.Minute),
			http.MethodPost, "/login-outcome", `{"username":"alice","success":true}`)
		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("status = %d, want 500", rec.Code)
		}
		if fake.successes["sub-alice"] {
			t.Error("counter must not be reset when the event could not be written")
		}

		fake = &fakeLoginAttempts{auditErr: errors.New("audit_log unavailable")}
		rec = doAuth(t, authRouterWithResolver(fake, known, threshold, 15*time.Minute),
			http.MethodPost, "/login-outcome", `{"username":"alice","success":false}`)
		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("failed login: status = %d, want 500", rec.Code)
		}
		if len(fake.failures) != 0 {
			t.Error("counter must not advance when the event could not be written")
		}
	})

	t.Run("unusable request context is dropped rather than stored", func(t *testing.T) {
		fake := &fakeLoginAttempts{}
		rec := doAuth(t, authRouterWithResolver(fake, known, threshold, 15*time.Minute),
			http.MethodPost, "/login-outcome",
			`{"username":"alice","success":true,"forwarded_for":"not-an-ip","user_agent":"ua\nwith\rbreaks"}`)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204", rec.Code)
		}
		got := fake.lastEntry()
		if _, present := got.Metadata["ipAddress"]; present {
			t.Errorf("an unparseable address must be omitted, got %v", got.Metadata["ipAddress"])
		}
		if ua, _ := got.Metadata["userAgent"].(string); strings.ContainsAny(ua, "\n\r") {
			t.Errorf("user agent kept control characters: %q", ua)
		}
	})

	t.Run("an oversized user agent is capped", func(t *testing.T) {
		fake := &fakeLoginAttempts{}
		long := strings.Repeat("A", maxUserAgentLen+200)
		rec := doAuth(t, authRouterWithResolver(fake, known, threshold, 15*time.Minute),
			http.MethodPost, "/login-outcome",
			`{"username":"alice","success":true,"user_agent":"`+long+`"}`)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204", rec.Code)
		}
		if ua, _ := fake.lastEntry().Metadata["userAgent"].(string); len(ua) != maxUserAgentLen {
			t.Errorf("user agent length = %d, want %d", len(ua), maxUserAgentLen)
		}
	})
}
