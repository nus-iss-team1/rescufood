package api

import (
	"strings"
	"testing"
)

func TestLogSafe(t *testing.T) {
	cases := map[string]struct{ in, want string }{
		"plain":         {"policy violation", "policy violation"},
		"newline":       {"ok\nlevel=ERROR msg=forged", "ok level=ERROR msg=forged"},
		"carriage":      {"a\r\nb", "a  b"},
		"control chars": {"a\x00\x1bb", "a  b"},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			if got := logSafe(tc.in); got != tc.want {
				t.Fatalf("got %q, want %q", got, tc.want)
			}
		})
	}

	t.Run("caps length", func(t *testing.T) {
		got := logSafe(strings.Repeat("x", 600))
		if len(got) != 503 || !strings.HasSuffix(got, "...") {
			t.Fatalf("length %d, suffix %q", len(got), got[len(got)-3:])
		}
	})
}

func TestClientIP(t *testing.T) {
	cases := []struct {
		name         string
		forwardedFor string
		want         string
	}{
		{"absent", "", ""},
		{"single hop from the balancer", "203.0.113.7", "203.0.113.7"},
		{"padded", "  203.0.113.7  ", "203.0.113.7"},
		// The balancer appends what it saw, so a chain the client prefixed
		// itself must not win: the last entry is the trustworthy one.
		{"client-supplied prefix is ignored", "1.2.3.4, 203.0.113.7", "203.0.113.7"},
		{"spoofed private address prefix", "10.0.0.1, 127.0.0.1, 203.0.113.7", "203.0.113.7"},
		{"several proxies", "1.2.3.4, 5.6.7.8, 203.0.113.9", "203.0.113.9"},
		{"with a port", "203.0.113.7:51234", "203.0.113.7"},
		{"ipv6", "2001:db8::1", "2001:db8::1"},
		{"bracketed ipv6 with a port", "[2001:db8::1]:443", "2001:db8::1"},
		{"garbage only", "not-an-ip", ""},
		{"trailing garbage falls back to the last valid hop", "203.0.113.7, nonsense", "203.0.113.7"},
		{"header present but empty", "   ", ""},
		{"empty entries", "203.0.113.7, ,", "203.0.113.7"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := clientIP(c.forwardedFor); got != c.want {
				t.Errorf("clientIP(%q) = %q, want %q", c.forwardedFor, got, c.want)
			}
		})
	}
}

func TestAuditText(t *testing.T) {
	t.Run("strips control characters", func(t *testing.T) {
		if got := auditText("Mozilla\n5.0\r\x00(x)", 100); got != "Mozilla5.0(x)" {
			t.Errorf("got %q", got)
		}
	})

	t.Run("caps length", func(t *testing.T) {
		if got := auditText(strings.Repeat("A", 50), 10); len(got) != 10 {
			t.Errorf("length = %d, want 10", len(got))
		}
	})

	t.Run("trims surrounding space", func(t *testing.T) {
		if got := auditText("  curl/8  ", 100); got != "curl/8" {
			t.Errorf("got %q", got)
		}
	})
}
