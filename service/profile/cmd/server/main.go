package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/lmittmann/tint"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/api"
	"github.com/nus-iss-team1/rescufood/service/profile/internal/auth"
	"github.com/nus-iss-team1/rescufood/service/profile/internal/store"
)

func newLogger(env string) *slog.Logger {
	if env == "development" {
		return slog.New(tint.NewTextHandler(os.Stdout, &tint.Options{
			TimeFormat: time.ANSIC,
		}))
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, nil))
}

func main() {
	_ = godotenv.Load()
	logger := newLogger(os.Getenv("ENV"))
	slog.SetDefault(logger)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// connect to database.
	pool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err == nil {
		err = pool.Ping(ctx)
	}
	if err != nil {
		logger.Error("unable to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()
	logger.Info("successfully connected to database")

	verifier, err := auth.NewVerifier(ctx, os.Getenv("AUTH_COGNITO_ISSUER"))
	if err != nil {
		logger.Error("unable to configure token verifier", "error", err)
		os.Exit(1)
	}

	origins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if origins == "" {
		origins = "http://localhost:5173"
	}

	st := store.New(pool)
	router := api.NewRouter(api.Deps{
		Logger:         logger,
		Store:          st,
		Auth:           auth.Middleware(verifier, st.Users),
		AllowedOrigins: strings.Split(origins, ","),
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}
	logger.Info("profile service listening", "port", port)
	if err := srv.ListenAndServe(); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
