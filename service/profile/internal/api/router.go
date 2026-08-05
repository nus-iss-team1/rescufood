package api

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
	"github.com/nus-iss-team1/rescufood/service/profile/internal/store"
)

const currentAPIVersion = "1"

type Deps struct {
	Logger *slog.Logger
	Store  *store.Store
	Auth   func(http.Handler) http.Handler
	// Browser origins allowed to call the API cross-origin.
	AllowedOrigins []string
}

func NewRouter(d Deps) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID, requestLogger(d.Logger), middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: d.AllowedOrigins,
		AllowedMethods: []string{"GET", "POST", "PATCH", "OPTIONS"},
		AllowedHeaders: []string{"Authorization", "Content-Type", "Api-Version"},
		ExposedHeaders: []string{"Api-Version"},
		MaxAge:         300,
	}))

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	r.Route("/api/profile", func(r chi.Router) {
		r.Use(apiVersion)

		// Public: organisation registration precedes user signup.
		r.Post("/orgs/register", registerOrg(d.Store.Organisations))
		r.Get("/orgs/lookup", lookupOrg(d.Store.Organisations))

		r.Group(func(r chi.Router) {
			r.Use(d.Auth)
			r.Get("/me", getMe(d.Store.Organisations))
			r.Get("/me/org/members", listMyOrgMembers(d.Store.Users))

			r.Route("/admin", func(r chi.Router) {
				r.Use(requireAdmin)
				orgs := d.Store.Organisations
				users := d.Store.Users

				r.Route("/orgs", func(r chi.Router) {
					r.Get("/", listOrgs(orgs))
					r.Get("/counts", countOrgs(orgs))
					r.Post("/{id}/approve", transitionOrg(orgs, "approve", (*domain.Organisation).Approve))
					r.Post("/{id}/reject", transitionOrg(orgs, "reject", (*domain.Organisation).Reject))
					r.Post("/{id}/suspend", transitionOrg(orgs, "suspend", (*domain.Organisation).Suspend))
				})

				r.Route("/users", func(r chi.Router) {
					r.Get("/", listUsers(users))
					r.Post("/{id}/suspend", transitionUser(users, "suspend", domain.UserSuspended))
					r.Post("/{id}/reactivate", transitionUser(users, "reactivate", domain.UserActive))
				})
			})
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
