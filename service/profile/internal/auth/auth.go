// Package auth verifies Cognito bearer tokens and resolves them to
// profile users.
package auth

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"slices"
	"strings"

	"github.com/coreos/go-oidc/v3/oidc"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

type Claims struct {
	Sub      string
	Email    string
	Name     string
	Username string
	Groups   []string
}

// DisplayName prefers the token's name claim over the login username.
func (c *Claims) DisplayName() string {
	if c.Name != "" {
		return c.Name
	}
	return c.Username
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
		Name        string   `json:"name"`
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
		Name:     extra.Name,
		Username: username,
		Groups:   extra.Groups,
	}, nil
}

// adminGroup is the Cognito group whose members are platform admins.
const adminGroup = "admin"

// UserStore resolves verified claims to a profile user row.
type UserStore interface {
	UpsertBySub(ctx context.Context, sub, email, name, username string, isAdmin bool) (*domain.User, domain.UserProvisioning, error)
}

// Welcomer sends a one-time welcome notification to a newly provisioned user.
type Welcomer interface {
	SendWelcome(ctx context.Context, to, name, orgType, cognitoSub string) error
}

// Middleware rejects requests without a valid bearer token, provisions
// the user row on first sight and stores the user in the context. When
// welcomer is non-nil a welcome email is sent the first time a user is
// seen; a send failure is logged but never blocks the request.
func Middleware(v *Verifier, users UserStore, welcomer Welcomer) func(http.Handler) http.Handler {
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
			user, prov, err := users.UpsertBySub(r.Context(), claims.Sub, claims.Email, claims.DisplayName(), claims.Username,
				slices.Contains(claims.Groups, adminGroup))
			if err != nil {
				slog.ErrorContext(r.Context(), "user provisioning failed", "error", err)
				http.Error(w, "internal error", http.StatusInternalServerError)
				return
			}
			if prov.Inserted && welcomer != nil && user.Email != "" {
				if err := welcomer.SendWelcome(r.Context(), user.Email, user.Name, string(prov.OrgType), user.CognitoSub); err != nil {
					slog.ErrorContext(r.Context(), "welcome notification failed", "user_id", user.ID, "error", err)
				}
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
