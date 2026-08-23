package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// LoginAttempts tracks failed-login counters and temporary restrictions
// for the app's own login form (public, unauthenticated - the account is
// not yet known to hold a session).
type LoginAttempts interface {
	Check(ctx context.Context, username string) (bool, *time.Time, error)
	RecordFailure(ctx context.Context, username string, threshold int, duration time.Duration) (bool, *time.Time, bool, error)
	RecordSuccess(ctx context.Context, username string) error
}

// SubjectResolver maps a login identifier (username or email - Cognito
// accepts either) to the account's stable cognito_sub, so lockout state
// keys on one identity no matter which form was typed.
type SubjectResolver interface {
	ResolveCognitoSub(ctx context.Context, identifier string) (string, error)
}

// resolveKey returns the account's cognito_sub when known, otherwise the
// identifier as typed - still tracks repeat attempts consistently for an
// account this service has never seen authenticate successfully.
func resolveKey(ctx context.Context, resolver SubjectResolver, identifier string) string {
	if sub, err := resolver.ResolveCognitoSub(ctx, identifier); err == nil {
		return sub
	}
	return identifier
}

type loginStatusResponse struct {
	Restricted bool       `json:"restricted"`
	RetryAfter *time.Time `json:"retry_after,omitempty"`
}

// loginStatus reports whether username is currently restricted, so the
// caller can refuse to even attempt authentication (AC6).
func loginStatus(attempts LoginAttempts, resolver SubjectResolver) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		username := strings.TrimSpace(r.URL.Query().Get("username"))
		if username == "" {
			writeProblem(w, http.StatusBadRequest, "invalid request", "username is required")
			return
		}

		key := resolveKey(r.Context(), resolver, username)
		restricted, until, err := attempts.Check(r.Context(), key)
		if err != nil {
			slog.ErrorContext(r.Context(), "check login status failed", "error", err)
			writeProblem(w, http.StatusInternalServerError, "internal error", "")
			return
		}
		writeJSON(w, http.StatusOK, loginStatusResponse{Restricted: restricted, RetryAfter: until})
	}
}

type loginOutcomeRequest struct {
	Username string `json:"username"`
	Success  bool   `json:"success"`
}

// loginOutcome records the result of a login attempt, applying the
// failed-login threshold and resetting it after success (AC5, AC7 relies
// on locked_until alone; "reset on success" satisfied here).
func loginOutcome(attempts LoginAttempts, resolver SubjectResolver, threshold int, duration time.Duration) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req loginOutcomeRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
			writeProblem(w, http.StatusBadRequest, "invalid request", "body must be valid JSON")
			return
		}
		username := strings.TrimSpace(req.Username)
		if username == "" {
			writeProblem(w, http.StatusBadRequest, "invalid request", "username is required")
			return
		}
		key := resolveKey(r.Context(), resolver, username)

		if req.Success {
			if err := attempts.RecordSuccess(r.Context(), key); err != nil {
				slog.ErrorContext(r.Context(), "record login success failed", "error", err)
				writeProblem(w, http.StatusInternalServerError, "internal error", "")
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}

		_, until, newlyLocked, err := attempts.RecordFailure(r.Context(), key, threshold, duration)
		if err != nil {
			slog.ErrorContext(r.Context(), "record login failure failed", "error", err)
			writeProblem(w, http.StatusInternalServerError, "internal error", "")
			return
		}
		if newlyLocked {
			slog.InfoContext(r.Context(), "account restricted",
				"username", logSafe(username),
				"locked_until", until,
			)
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

type passwordResetCompletedRequest struct {
	Username string `json:"username"`
}

// passwordResetCompleted records the security audit event for a
// completed password reset and clears any active failed-login
// restriction. No password or code ever reaches this handler.
func passwordResetCompleted(attempts LoginAttempts, resolver SubjectResolver) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req passwordResetCompletedRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
			writeProblem(w, http.StatusBadRequest, "invalid request", "body must be valid JSON")
			return
		}
		username := strings.TrimSpace(req.Username)
		if username == "" {
			writeProblem(w, http.StatusBadRequest, "invalid request", "username is required")
			return
		}

		key := resolveKey(r.Context(), resolver, username)
		if err := attempts.RecordSuccess(r.Context(), key); err != nil {
			slog.ErrorContext(r.Context(), "clear lockout after password reset failed", "error", err)
			writeProblem(w, http.StatusInternalServerError, "internal error", "")
			return
		}

		slog.InfoContext(r.Context(), "password reset completed", "username", logSafe(username))
		w.WriteHeader(http.StatusNoContent)
	}
}

// SuspensionChecker reports whether an identifier belongs to a suspended
// account.
type SuspensionChecker interface {
	IsSuspended(ctx context.Context, identifier string) (bool, error)
}

type resetEligibilityResponse struct {
	Eligible bool `json:"eligible"`
}

// resetEligibility reports whether identifier is allowed to reset its
// password: blocked only for a deliberate admin suspension, not for a
// failed-login lockout. Called server-to-server from web/platform, never from a browser,
// so the response can be a plain boolean without leaking anything to a
// public caller.
func resetEligibility(checker SuspensionChecker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := strings.TrimSpace(r.URL.Query().Get("identifier"))
		if identifier == "" {
			writeProblem(w, http.StatusBadRequest, "invalid request", "identifier is required")
			return
		}

		suspended, err := checker.IsSuspended(r.Context(), identifier)
		if err != nil {
			slog.ErrorContext(r.Context(), "check reset eligibility failed", "error", err)
			writeProblem(w, http.StatusInternalServerError, "internal error", "")
			return
		}
		writeJSON(w, http.StatusOK, resetEligibilityResponse{Eligible: !suspended})
	}
}
