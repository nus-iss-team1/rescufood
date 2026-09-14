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
