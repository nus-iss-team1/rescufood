package api

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/auth"
	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

// OrgAdmin reads and updates organisations for admin workflows.
type OrgAdmin interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Organisation, error)
	UpdateStatus(ctx context.Context, o *domain.Organisation) error
	List(ctx context.Context, status domain.OrgStatus) ([]domain.Organisation, error)
	ListAll(ctx context.Context) ([]domain.Organisation, error)
	CountByStatus(ctx context.Context) (map[string]int, error)
}

// UserAdmin reads and updates users for admin workflows.
type UserAdmin interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	ListByOrg(ctx context.Context, orgID uuid.UUID) ([]domain.User, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.UserStatus) error
}

// requireAdmin rejects requests whose authenticated user is not an admin.
func requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := auth.UserFromContext(r.Context())
		if !ok || !user.IsAdmin {
			writeProblem(w, http.StatusForbidden, "forbidden", "admin access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

var orgStatuses = map[string]domain.OrgStatus{
	"pending":   domain.OrgPending,
	"approved":  domain.OrgApproved,
	"rejected":  domain.OrgRejected,
	"suspended": domain.OrgSuspended,
}

func listOrgs(orgs OrgAdmin) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query().Get("status")
		if q == "" {
			q = "pending"
		}

		var list []domain.Organisation
		var err error
		if q == "all" {
			list, err = orgs.ListAll(r.Context())
		} else {
			status, ok := orgStatuses[q]
			if !ok {
				writeProblem(w, http.StatusBadRequest, "invalid request",
					"status must be all, pending, approved, rejected or suspended")
				return
			}
			list, err = orgs.List(r.Context(), status)
		}
		if err != nil {
			slog.ErrorContext(r.Context(), "list organisations failed", "error", err)
			writeProblem(w, http.StatusInternalServerError, "internal error", "")
			return
		}

		out := make([]orgResponse, 0, len(list))
		for i := range list {
			out = append(out, toOrgResponse(&list[i]))
		}
		writeJSON(w, http.StatusOK, out)
	}
}

// countOrgs reports organisation totals per status, zero-filled.
func countOrgs(orgs OrgAdmin) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		counts, err := orgs.CountByStatus(r.Context())
		if err != nil {
			slog.ErrorContext(r.Context(), "count organisations failed", "error", err)
			writeProblem(w, http.StatusInternalServerError, "internal error", "")
			return
		}
		out := map[string]int{}
		for name := range orgStatuses {
			out[name] = counts[name]
		}
		writeJSON(w, http.StatusOK, out)
	}
}

type userResponse struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	IsAdmin   bool      `json:"is_admin"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

func toUserResponse(u *domain.User) userResponse {
	return userResponse{
		ID:        u.ID,
		Email:     u.Email,
		Name:      u.Name,
		IsAdmin:   u.IsAdmin,
		Status:    string(u.Status),
		CreatedAt: u.CreatedAt,
	}
}

// listUsers returns the members of one organisation.
func listUsers(users UserAdmin) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orgID, err := uuid.Parse(r.URL.Query().Get("org_id"))
		if err != nil {
			writeProblem(w, http.StatusBadRequest, "invalid request", "org_id must be a uuid")
			return
		}
		list, err := users.ListByOrg(r.Context(), orgID)
		if err != nil {
			slog.ErrorContext(r.Context(), "list users failed", "error", err)
			writeProblem(w, http.StatusInternalServerError, "internal error", "")
			return
		}
		out := make([]userResponse, 0, len(list))
		for i := range list {
			out = append(out, toUserResponse(&list[i]))
		}
		writeJSON(w, http.StatusOK, out)
	}
}

// transitionUser suspends or reactivates one user, requiring a reason.
func transitionUser(users UserAdmin, action string, target domain.UserStatus) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		admin, ok := auth.UserFromContext(r.Context())
		if !ok {
			writeProblem(w, http.StatusUnauthorized, "unauthorized", "no authenticated user")
			return
		}

		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeProblem(w, http.StatusBadRequest, "invalid request", "id must be a uuid")
			return
		}

		var req transitionRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
			writeProblem(w, http.StatusBadRequest, "invalid request", "body must be valid JSON")
			return
		}
		if strings.TrimSpace(req.Reason) == "" {
			writeProblem(w, http.StatusBadRequest, "invalid request", "reason is required")
			return
		}

		user, err := users.GetByID(r.Context(), id)
		if errors.Is(err, domain.ErrNotFound) {
			writeProblem(w, http.StatusNotFound, "not found", "no such user")
			return
		}
		if err != nil {
			slog.ErrorContext(r.Context(), "load user failed", "error", err)
			writeProblem(w, http.StatusInternalServerError, "internal error", "")
			return
		}

		if user.ID == admin.ID {
			writeProblem(w, http.StatusConflict, "conflict", "you cannot "+action+" your own account")
			return
		}
		if user.IsAdmin && target == domain.UserSuspended {
			writeProblem(w, http.StatusConflict, "conflict", "administrators cannot be suspended")
			return
		}
		if user.Status == target {
			writeProblem(w, http.StatusConflict, "conflict", "user is already "+string(target))
			return
		}

		if err := users.UpdateStatus(r.Context(), user.ID, target); err != nil {
			slog.ErrorContext(r.Context(), "update user failed", "error", err)
			writeProblem(w, http.StatusInternalServerError, "internal error", "")
			return
		}

		slog.InfoContext(r.Context(), "user status changed",
			"user_id", user.ID,
			"action", action,
			"actor_id", admin.ID,
			"reason", logSafe(req.Reason),
		)
		user.Status = target
		writeJSON(w, http.StatusOK, toUserResponse(user))
	}
}

type transitionRequest struct {
	Reason string `json:"reason"`
}

// transitionOrg applies one status transition, requiring a reason.
func transitionOrg(orgs OrgAdmin, action string, apply func(*domain.Organisation) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		admin, ok := auth.UserFromContext(r.Context())
		if !ok {
			writeProblem(w, http.StatusUnauthorized, "unauthorized", "no authenticated user")
			return
		}

		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeProblem(w, http.StatusBadRequest, "invalid request", "id must be a uuid")
			return
		}

		var req transitionRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
			writeProblem(w, http.StatusBadRequest, "invalid request", "body must be valid JSON")
			return
		}
		if strings.TrimSpace(req.Reason) == "" {
			writeProblem(w, http.StatusBadRequest, "invalid request", "reason is required")
			return
		}

		org, err := orgs.GetByID(r.Context(), id)
		if errors.Is(err, domain.ErrNotFound) {
			writeProblem(w, http.StatusNotFound, "not found", "no such organisation")
			return
		}
		if err != nil {
			slog.ErrorContext(r.Context(), "load organisation failed", "error", err)
			writeProblem(w, http.StatusInternalServerError, "internal error", "")
			return
		}

		if err := apply(org); errors.Is(err, domain.ErrInvalidTransition) {
			writeProblem(w, http.StatusConflict, "conflict",
				"cannot "+action+" an organisation in status "+string(org.Status))
			return
		}

		if err := orgs.UpdateStatus(r.Context(), org); err != nil {
			slog.ErrorContext(r.Context(), "update organisation failed", "error", err)
			writeProblem(w, http.StatusInternalServerError, "internal error", "")
			return
		}

		slog.InfoContext(r.Context(), "organisation status changed",
			"org_id", org.ID,
			"action", action,
			"actor_id", admin.ID,
			"reason", logSafe(req.Reason),
		)
		writeJSON(w, http.StatusOK, toOrgResponse(org))
	}
}
