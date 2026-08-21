package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
)

type fakeLoginAttempts struct {
	restricted  bool
	until       *time.Time
	failures    map[string]int
	successes   map[string]bool
	threshold   int
	newlyLocked bool
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

func authRouter(attempts *fakeLoginAttempts, threshold int, duration time.Duration) http.Handler {
	r := chi.NewRouter()
	r.Get("/login-status", loginStatus(attempts))
	r.Post("/login-outcome", loginOutcome(attempts, threshold, duration))
	r.Post("/password-reset-completed", passwordResetCompleted())
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
}

func TestPasswordResetCompleted(t *testing.T) {
	t.Run("missing username", func(t *testing.T) {
		rec := doAuth(t, authRouter(&fakeLoginAttempts{}, 5, 15*time.Minute),
			http.MethodPost, "/password-reset-completed", `{}`)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want 400", rec.Code)
		}
	})

	t.Run("records the event", func(t *testing.T) {
		rec := doAuth(t, authRouter(&fakeLoginAttempts{}, 5, 15*time.Minute),
			http.MethodPost, "/password-reset-completed", `{"username":"alice"}`)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want 204", rec.Code)
		}
	})
}
