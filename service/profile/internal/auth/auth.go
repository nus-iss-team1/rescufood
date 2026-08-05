// Package auth verifies Cognito bearer tokens and resolves them to
// profile users.
package auth

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/coreos/go-oidc/v3/oidc"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

type Claims struct {
	Sub      string
	Email    string
	Username string
	Groups   []string
}

type Verifier struct {
	oidc *oidc.IDTokenVerifier
}

// NewVerifier fetches the issuer's OIDC discovery document and returns
// a verifier for its tokens. Client id is not checked: Cognito access
// tokens carry no aud claim.
func NewVerifier(ctx context.Context, issuer string) (*Verifier, error) {
	provider, err := oidc.NewProvider(ctx, issuer)
	if err != nil {
		return nil, err
	}
	return &Verifier{
		oidc: provider.Verifier(&oidc.Config{SkipClientIDCheck: true}),
	}, nil
}

// Verify checks signature, expiry and issuer of raw and returns its claims.
func (v *Verifier) Verify(ctx context.Context, raw string) (*Claims, error) {
	token, err := v.oidc.Verify(ctx, raw)
	if err != nil {
		return nil, err
	}
	var extra struct {
		Email       string   `json:"email"`
		Username    string   `json:"cognito:username"`
		UsernameAlt string   `json:"username"`
		Groups      []string `json:"cognito:groups"`
	}
	if err := token.Claims(&extra); err != nil {
		return nil, err
	}
	username := extra.Username
	if username == "" {
		username = extra.UsernameAlt
	}
	return &Claims{
		Sub:      token.Subject,
		Email:    extra.Email,
		Username: username,
		Groups:   extra.Groups,
	}, nil
}

// UserStore resolves verified claims to a profile user row.
type UserStore interface {
	UpsertBySub(ctx context.Context, sub, email, name string) (*domain.User, error)
}

// Middleware rejects requests without a valid bearer token, provisions
// the user row on first sight and stores the user in the context.
func Middleware(v *Verifier, users UserStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
			raw = strings.TrimSpace(raw)
			if !ok || raw == "" {
				unauthorized(w, "missing bearer token")
				return
			}
			claims, err := v.Verify(r.Context(), raw)
			if err != nil {
				unauthorized(w, "invalid token")
				return
			}
			user, err := users.UpsertBySub(r.Context(), claims.Sub, claims.Email, claims.Username)
			if err != nil {
				slog.ErrorContext(r.Context(), "user provisioning failed", "error", err)
				http.Error(w, "internal error", http.StatusInternalServerError)
				return
			}
			if user.Status == domain.UserSuspended {
				forbidden(w, "user is suspended")
				return
			}
			next.ServeHTTP(w, r.WithContext(WithUser(r.Context(), user)))
		})
	}
}

func unauthorized(w http.ResponseWriter, detail string) {
	w.Header().Set("WWW-Authenticate", "Bearer")
	writeProblem(w, http.StatusUnauthorized, "unauthorized", detail)
}

func forbidden(w http.ResponseWriter, detail string) {
	writeProblem(w, http.StatusForbidden, "forbidden", detail)
}

func writeProblem(w http.ResponseWriter, status int, title, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"title":  title,
		"status": status,
		"detail": detail,
	})
}
