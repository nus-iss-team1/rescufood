// Package config reads the service's environment.
package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// AllowedOrigins splits CORS_ALLOWED_ORIGINS, dropping blanks so a
// trailing comma is harmless. Falls back to the local admin console.
func AllowedOrigins() []string {
	var out []string
	for _, o := range strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",") {
		if o = strings.TrimSpace(o); o != "" {
			out = append(out, o)
		}
	}
	if len(out) == 0 {
		return []string{"http://localhost:5173"}
	}
	return out
}

// DatabaseURL returns DATABASE_URL when set, otherwise a DSN composed
// from DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME and DB_SSLMODE.
func DatabaseURL() (string, error) {
	if dsn := os.Getenv("DATABASE_URL"); dsn != "" {
		return dsn, nil
	}

	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	name := os.Getenv("DB_NAME")
	if host == "" || user == "" || name == "" {
		return "", fmt.Errorf("set DATABASE_URL, or DB_HOST, DB_USER and DB_NAME")
	}

	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	sslmode := os.Getenv("DB_SSLMODE")
	if sslmode == "" {
		sslmode = "require"
	}

	dsn := url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(user, os.Getenv("DB_PASSWORD")),
		Host:     host + ":" + port,
		Path:     "/" + name,
		RawQuery: "sslmode=" + url.QueryEscape(sslmode),
	}
	return dsn.String(), nil
}

// FailedLoginThreshold returns FAILED_LOGIN_THRESHOLD, falling back to 5
// when unset, non-numeric, or not positive.
func FailedLoginThreshold() int {
	n, err := strconv.Atoi(os.Getenv("FAILED_LOGIN_THRESHOLD"))
	if err != nil || n <= 0 {
		return 5
	}
	return n
}

// RestrictionDuration returns LOGIN_RESTRICTION_DURATION (a Go duration
// string, e.g. "15m"), falling back to 15 minutes when unset, unparsable,
// or not positive.
func RestrictionDuration() time.Duration {
	d, err := time.ParseDuration(os.Getenv("LOGIN_RESTRICTION_DURATION"))
	if err != nil || d <= 0 {
		return 15 * time.Minute
	}
	return d
}
