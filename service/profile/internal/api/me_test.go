package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/nus-iss-team1/rescufood/service/profile/internal/auth"
	"github.com/nus-iss-team1/rescufood/service/profile/internal/domain"
)

type fakeOrgGetter struct {
	org *domain.Organisation
}

func (f *fakeOrgGetter) GetByID(_ context.Context, id uuid.UUID) (*domain.Organisation, error) {
	if f.org == nil || f.org.ID != id {
		return nil, domain.ErrNotFound
	}
	return f.org, nil
}

func doGetMe(t *testing.T, user *domain.User, orgs OrgGetter) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	if user != nil {
		req = req.WithContext(auth.WithUser(req.Context(), user))
	}
	rec := httptest.NewRecorder()
	getMe(orgs)(rec, req)
	return rec
}

func TestListMyOrgMembers(t *testing.T) {
	orgID := uuid.New()
	users := &fakeUserAdmin{
		user: &domain.User{ID: uuid.New(), OrgID: &orgID, Email: "mate@freshmart.sg"},
	}

	call := func(user *domain.User) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, "/me/org/members", nil)
		if user != nil {
			req = req.WithContext(auth.WithUser(req.Context(), user))
		}
		rec := httptest.NewRecorder()
		listMyOrgMembers(users)(rec, req)
		return rec
	}

	t.Run("member sees teammates", func(t *testing.T) {
		rec := call(&domain.User{ID: uuid.New(), OrgID: &orgID})
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "mate@freshmart.sg") {
			t.Fatalf("code=%d body=%s", rec.Code, rec.Body)
		}
	})

	t.Run("user without an org", func(t *testing.T) {
		if rec := call(&domain.User{ID: uuid.New()}); rec.Code != http.StatusNotFound {
			t.Fatalf("status = %d, want 404", rec.Code)
		}
	})

	t.Run("unauthenticated", func(t *testing.T) {
		if rec := call(nil); rec.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want 401", rec.Code)
		}
	})
}

func TestGetMe(t *testing.T) {
	t.Run("no user", func(t *testing.T) {
		rec := doGetMe(t, nil, &fakeOrgGetter{})
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want 401", rec.Code)
		}
	})

	t.Run("without org", func(t *testing.T) {
		user := &domain.User{ID: uuid.New(), Email: "a@b.sg", IsAdmin: true, Status: domain.UserActive}
		rec := doGetMe(t, user, &fakeOrgGetter{})
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		var resp meResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatal(err)
		}
		if !resp.IsAdmin || resp.Org != nil {
			t.Fatalf("want admin without org, got %+v", resp)
		}
	})

	t.Run("with org", func(t *testing.T) {
		org := &domain.Organisation{
			ID: uuid.New(), Name: "Fresh Mart",
			Type: domain.OrgDonor, Status: domain.OrgApproved,
		}
		user := &domain.User{ID: uuid.New(), OrgID: &org.ID, Status: domain.UserActive}
		rec := doGetMe(t, user, &fakeOrgGetter{org: org})
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		var resp meResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatal(err)
		}
		if resp.Org == nil || resp.Org.Type != "donor" || resp.Org.Status != "approved" {
			t.Fatalf("org missing or wrong: %+v", resp.Org)
		}
	})
}
