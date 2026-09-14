// Package logging carries a request-scoped slog.Logger through context.
package logging

import (
	"context"
	"log/slog"
)

type ctxKey struct{}

// WithLogger returns a copy of ctx carrying logger.
func WithLogger(ctx context.Context, logger *slog.Logger) context.Context {
	return context.WithValue(ctx, ctxKey{}, logger)
}

// FromContext returns the logger carried by ctx, or slog.Default().
func FromContext(ctx context.Context) *slog.Logger {
	if l, ok := ctx.Value(ctxKey{}).(*slog.Logger); ok {
		return l
	}
	return slog.Default()
}
