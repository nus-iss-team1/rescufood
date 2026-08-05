package api

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/auth"
	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

// OrgCreator persists a new organisation and its first member.
type OrgCreator interface {
	CreateOrganisationWithOwner(ctx context.Context, org *domain.Organisation, ownerID uuid.UUID) error
}

type createOrgRequest struct {
	Name         string `json:"name"`
	Type         string `json:"type"`
	Description  string `json:"description"`
	ContactEmail string `json:"contact_email"`
	ContactPhone string `json:"contact_phone"`
	Address      string `json:"address"`
}

type orgResponse struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Type         string    `json:"type"`
	Status       string    `json:"status"`
	Description  string    `json:"description"`
	ContactEmail string    `json:"contact_email"`
	ContactPhone string    `json:"contact_phone"`
	Address      string    `json:"address"`
	CreatedAt    time.Time `json:"created_at"`
}

func createOrg(orgs OrgCreator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			writeProblem(w, http.StatusUnauthorized, "unauthorized", "no authenticated user")
			return
		}
		if user.OrgID != nil {
			writeProblem(w, http.StatusConflict, "conflict", "user already belongs to an organisation")
			return
		}

		var req createOrgRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
			writeProblem(w, http.StatusBadRequest, "invalid request", "body must be valid JSON")
			return
		}

		org, err := domain.NewOrganisation(domain.NewOrganisationParams{
			Name:         req.Name,
			Type:         domain.OrgType(req.Type),
			Description:  req.Description,
			ContactEmail: req.ContactEmail,
			ContactPhone: req.ContactPhone,
			Address:      req.Address,
		})
		if err != nil {
			writeProblem(w, http.StatusBadRequest, "invalid request", err.Error())
			return
		}

		switch err := orgs.CreateOrganisationWithOwner(r.Context(), org, user.ID); {
		case errors.Is(err, domain.ErrNameTaken):
			writeProblem(w, http.StatusConflict, "conflict", err.Error())
			return
		case errors.Is(err, domain.ErrAlreadyInOrg):
			writeProblem(w, http.StatusConflict, "conflict", err.Error())
			return
		case err != nil:
			slog.ErrorContext(r.Context(), "create organisation failed", "error", err)
			writeProblem(w, http.StatusInternalServerError, "internal error", "")
			return
		}

		writeJSON(w, http.StatusCreated, orgResponse{
			ID:           org.ID,
			Name:         org.Name,
			Type:         string(org.Type),
			Status:       string(org.Status),
			Description:  org.Description,
			ContactEmail: org.ContactEmail,
			ContactPhone: org.ContactPhone,
			Address:      org.Address,
			CreatedAt:    org.CreatedAt,
		})
	}
}
