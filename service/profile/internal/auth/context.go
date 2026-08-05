package auth

import (
	"context"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

type ctxKey struct{}

// WithUser returns a copy of ctx carrying the authenticated user.
func WithUser(ctx context.Context, u *domain.User) context.Context {
	return context.WithValue(ctx, ctxKey{}, u)
}

// UserFromContext returns the authenticated user stored by Middleware.
func UserFromContext(ctx context.Context) (*domain.User, bool) {
	u, ok := ctx.Value(ctxKey{}).(*domain.User)
	return u, ok
}
