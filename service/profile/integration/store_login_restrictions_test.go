//go:build integration

package integration

import (
	"testing"
	"time"
)

const threshold = 3
const lockFor = time.Hour

func TestLoginRestrictions_RecordFailure_LocksAtThreshold(t *testing.T) {
	s := newStore(t)
	lr := s.LoginRestrictions

	for i := 1; i < threshold; i++ {
		locked, _, newly, err := lr.RecordFailure(ctxt(), "Alex", threshold, lockFor)
		if err != nil {
			t.Fatalf("failure %d: %v", i, err)
		}
		if locked || newly {
			t.Errorf("failure %d: locked=%v newly=%v, want both false", i, locked, newly)
		}
	}

	locked, until, newly, err := lr.RecordFailure(ctxt(), "alex", threshold, lockFor)
	if err != nil {
		t.Fatalf("threshold failure: %v", err)
	}
	if !locked || !newly {
		t.Errorf("threshold failure: locked=%v newly=%v, want both true", locked, newly)
	}
	if until == nil || time.Until(*until) < 55*time.Minute {
		t.Errorf("locked_until = %v, want ~1h out", until)
	}

	// Subsequent failures stay locked but are no longer "newly" locked.
	locked, _, newly, err = lr.RecordFailure(ctxt(), "alex", threshold, lockFor)
	if err != nil {
		t.Fatalf("post-lock failure: %v", err)
	}
	if !locked || newly {
		t.Errorf("post-lock failure: locked=%v newly=%v", locked, newly)
	}
}

func TestLoginRestrictions_CheckAndClear(t *testing.T) {
	s := newStore(t)
	lr := s.LoginRestrictions

	restricted, _, err := lr.Check(ctxt(), "sam")
	if err != nil || restricted {
		t.Fatalf("unknown user: restricted=%v err=%v", restricted, err)
	}

	for i := 0; i < threshold; i++ {
		if _, _, _, err := lr.RecordFailure(ctxt(), "sam", threshold, lockFor); err != nil {
			t.Fatalf("failure %d: %v", i, err)
		}
	}

	restricted, until, err := lr.Check(ctxt(), "SAM")
	if err != nil {
		t.Fatalf("Check: %v", err)
	}
	if !restricted || until == nil {
		t.Errorf("Check after lock: restricted=%v until=%v", restricted, until)
	}

	if err := lr.RecordSuccess(ctxt(), "sam"); err != nil {
		t.Fatalf("RecordSuccess: %v", err)
	}
	restricted, _, _ = lr.Check(ctxt(), "sam")
	if restricted {
		t.Error("still restricted after RecordSuccess")
	}
}

func TestLoginRestrictions_GetLockedUntil(t *testing.T) {
	s := newStore(t)
	lr := s.LoginRestrictions

	for i := 0; i < threshold; i++ {
		if _, _, _, err := lr.RecordFailure(ctxt(), "locked-user", threshold, lockFor); err != nil {
			t.Fatalf("lock: %v", err)
		}
	}
	if _, _, _, err := lr.RecordFailure(ctxt(), "one-strike", threshold, lockFor); err != nil {
		t.Fatalf("one strike: %v", err)
	}

	got, err := lr.GetLockedUntil(ctxt(), []string{"Locked-User", "one-strike", "never-seen"})
	if err != nil {
		t.Fatalf("GetLockedUntil: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("len(got) = %d, want 1: %v", len(got), got)
	}
	if _, ok := got["locked-user"]; !ok {
		t.Errorf("got = %v, want key locked-user", got)
	}
}
