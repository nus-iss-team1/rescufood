package api

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/auth"
	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

// OrgGetter loads one organisation.
type OrgGetter interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Organisation, error)
}

type meResponse struct {
	ID      uuid.UUID    `json:"id"`
	Email   string       `json:"email"`
	Name    string       `json:"name"`
	IsAdmin bool         `json:"is_admin"`
	Status  string       `json:"status"`
	Org     *orgResponse `json:"org"`
}

func getMe(orgs OrgGetter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			writeProblem(w, http.StatusUnauthorized, "unauthorized", "no authenticated user")
			return
		}

		resp := meResponse{
			ID:      user.ID,
			Email:   user.Email,
			Name:    user.Name,
			IsAdmin: user.IsAdmin,
			Status:  string(user.Status),
		}
		if user.OrgID != nil {
			org, err := orgs.GetByID(r.Context(), *user.OrgID)
			switch {
			case errors.Is(err, domain.ErrNotFound):
				// org row gone; report the user as org-less
			case err != nil:
				slog.ErrorContext(r.Context(), "load organisation failed", "error", err)
				writeProblem(w, http.StatusInternalServerError, "internal error", "")
				return
			default:
				o := toOrgResponse(org)
				resp.Org = &o
			}
		}
		writeJSON(w, http.StatusOK, resp)
	}
}
