package api

import (
	"net"
	"strings"
)

// clientIP returns the last X-Forwarded-For hop, the only one a client cannot forge.
func clientIP(forwardedFor string) string {
	hops := strings.Split(forwardedFor, ",")
	for i := len(hops) - 1; i >= 0; i-- {
		if addr := parseAddr(hops[i]); addr != "" {
			return addr
		}
	}
	return ""
}

// parseAddr normalises one X-Forwarded-For entry, tolerating a port and brackets.
func parseAddr(hop string) string {
	hop = strings.TrimSpace(hop)
	if hop == "" {
		return ""
	}
	if host, _, err := net.SplitHostPort(hop); err == nil {
		hop = host
	}
	hop = strings.Trim(hop, "[]")
	if net.ParseIP(hop) == nil {
		return ""
	}
	return hop
}

// auditText caps and strips control characters from a value to be retained.
func auditText(s string, max int) string {
	s = strings.Map(func(r rune) rune {
		if r < 0x20 || r == 0x7f {
			return -1
		}
		return r
	}, strings.TrimSpace(s))
	if len(s) > max {
		return s[:max]
	}
	return s
}

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
