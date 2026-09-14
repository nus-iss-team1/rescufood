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

	"github.com/google/uuid"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

// OrgRegistrar persists and looks up publicly registered organisations.
type OrgRegistrar interface {
	Create(ctx context.Context, org *domain.Organisation) error
	GetByDomain(ctx context.Context, dom string) (*domain.Organisation, error)
}

type registerOrgRequest struct {
	Name         string `json:"name"`
	Type         string `json:"type"`
	Domain       string `json:"domain"`
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
	Domain       string    `json:"domain"`
	Description  string    `json:"description"`
	ContactEmail string    `json:"contact_email"`
	ContactPhone string    `json:"contact_phone"`
	Address      string    `json:"address"`
	CreatedAt    time.Time `json:"created_at"`
}

func toOrgResponse(o *domain.Organisation) orgResponse {
	return orgResponse{
		ID:           o.ID,
		Name:         o.Name,
		Type:         string(o.Type),
		Status:       string(o.Status),
		Domain:       o.Domain,
		Description:  o.Description,
		ContactEmail: o.ContactEmail,
		ContactPhone: o.ContactPhone,
		Address:      o.Address,
		CreatedAt:    o.CreatedAt,
	}
}

// registerOrg handles the public organisation registration form.
func registerOrg(orgs OrgRegistrar) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req registerOrgRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
			writeProblem(w, http.StatusBadRequest, "invalid request", "body must be valid JSON")
			return
		}

		org, err := domain.NewOrganisation(domain.NewOrganisationParams{
			Name:         req.Name,
			Type:         domain.OrgType(req.Type),
			Domain:       req.Domain,
			Description:  req.Description,
			ContactEmail: req.ContactEmail,
			ContactPhone: req.ContactPhone,
			Address:      req.Address,
		})
		if err != nil {
			writeProblem(w, http.StatusBadRequest, "invalid request", err.Error())
			return
		}

		switch err := orgs.Create(r.Context(), org); {
		case errors.Is(err, domain.ErrNameTaken),
			errors.Is(err, domain.ErrDomainTaken):
			writeProblem(w, http.StatusConflict, "conflict", err.Error())
			return
		case err != nil:
			slog.ErrorContext(r.Context(), "register organisation failed", "error", err)
			writeProblem(w, http.StatusInternalServerError, "internal error", "")
			return
		}

		writeJSON(w, http.StatusCreated, toOrgResponse(org))
	}
}

// lookupOrg reports whether a domain belongs to a registered and
// approved organisation. It backs the signup gate.
func lookupOrg(orgs OrgRegistrar) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		dom := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("domain")))
		if dom == "" {
			writeProblem(w, http.StatusBadRequest, "invalid request", "domain query parameter is required")
			return
		}

		org, err := orgs.GetByDomain(r.Context(), dom)
		if errors.Is(err, domain.ErrNotFound) {
			writeJSON(w, http.StatusOK, map[string]bool{"registered": false, "approved": false})
			return
		}
		if err != nil {
			slog.ErrorContext(r.Context(), "lookup organisation failed", "error", err)
			writeProblem(w, http.StatusInternalServerError, "internal error", "")
			return
		}

		writeJSON(w, http.StatusOK, map[string]bool{
			"registered": org.Status != domain.OrgRejected,
			"approved":   org.Status == domain.OrgApproved,
		})
	}
}
