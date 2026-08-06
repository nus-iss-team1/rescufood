// Package config reads the service's environment.
package config

import (
	"fmt"
	"net/url"
	"os"
)

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
