package api

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"

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
		status, ok := orgStatuses[q]
		if !ok {
			writeProblem(w, http.StatusBadRequest, "invalid request",
				"status must be pending, approved, rejected or suspended")
			return
		}

		list, err := orgs.List(r.Context(), status)
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
			"reason", req.Reason,
		)
		writeJSON(w, http.StatusOK, toOrgResponse(org))
	}
}
