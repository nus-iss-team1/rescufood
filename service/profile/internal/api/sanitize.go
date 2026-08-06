package api

import "strings"

// logSafe strips characters that would let user input forge extra log
// entries, and caps the length.
func logSafe(s string) string {
	const max = 500
	s = strings.Map(func(r rune) rune {
		if r == '\n' || r == '\r' || r < 0x20 {
			return ' '
		}
		return r
	}, s)
	if len(s) > max {
		return s[:max] + "..."
	}
	return s
}
