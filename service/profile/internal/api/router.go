package api

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/store"
)

const currentAPIVersion = "1"

type Deps struct {
	Logger *slog.Logger
	Store  *store.Store
	Auth   func(http.Handler) http.Handler
}

func NewRouter(d Deps) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID, requestLogger(d.Logger), middleware.Recoverer)

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	r.Route("/api/profile", func(r chi.Router) {
		r.Use(apiVersion)
		r.Group(func(r chi.Router) {
			r.Use(d.Auth)
			r.Post("/orgs", createOrg(d.Store))
		})
	})

	return r
}

// apiVersion validates the Api-Version request header, defaults it to
// the current version and echoes the served version on the response.
func apiVersion(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if v := r.Header.Get("Api-Version"); v != "" && v != currentAPIVersion {
			writeProblem(w, http.StatusBadRequest, "unsupported api version",
				"this service only supports Api-Version "+currentAPIVersion)
			return
		}
		w.Header().Set("Api-Version", currentAPIVersion)
		next.ServeHTTP(w, r)
	})
}
