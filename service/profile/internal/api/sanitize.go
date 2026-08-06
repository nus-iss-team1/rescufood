package api

import "strings"

// logSafe strips characters that would let user input forge extra log
// entries, and caps the length.
func logSafe(s string) string {
	const max = 500
	// Line breaks first and by name: this is the form codeql
	// recognises as a log-injection barrier.
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\r", " ")
	s = strings.Map(func(r rune) rune {
		if r < 0x20 {
			return ' '
		}
		return r
	}, s)
	if len(s) > max {
		return s[:max] + "..."
	}
	return s
}
