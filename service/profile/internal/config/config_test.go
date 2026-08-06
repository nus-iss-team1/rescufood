package config

import (
	"strings"
	"testing"
)

func TestAllowedOrigins(t *testing.T) {
	cases := map[string]struct {
		env  string
		want []string
	}{
		"unset":          {"", []string{"http://localhost:5173"}},
		"single":         {"http://a", []string{"http://a"}},
		"trailing comma": {"http://a,", []string{"http://a"}},
		"spaces":         {" http://a , http://b ", []string{"http://a", "http://b"}},
		"only commas":    {",,", []string{"http://localhost:5173"}},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			t.Setenv("CORS_ALLOWED_ORIGINS", tc.env)
			got := AllowedOrigins()
			if strings.Join(got, "|") != strings.Join(tc.want, "|") {
				t.Fatalf("got %v, want %v", got, tc.want)
			}
		})
	}
}

func TestDatabaseURL(t *testing.T) {
	t.Run("prefers DATABASE_URL", func(t *testing.T) {
		t.Setenv("DATABASE_URL", "postgres://a:b@h:5432/db")
		t.Setenv("DB_HOST", "ignored")
		got, err := DatabaseURL()
		if err != nil || got != "postgres://a:b@h:5432/db" {
			t.Fatalf("got %q, err %v", got, err)
		}
	})

	t.Run("composes from parts with defaults", func(t *testing.T) {
		t.Setenv("DATABASE_URL", "")
		t.Setenv("DB_HOST", "db.example.com")
		t.Setenv("DB_USER", "profile")
		t.Setenv("DB_PASSWORD", "s3cret")
		t.Setenv("DB_NAME", "profile")
		got, err := DatabaseURL()
		if err != nil {
			t.Fatal(err)
		}
		want := "postgres://profile:s3cret@db.example.com:5432/profile?sslmode=require"
		if got != want {
			t.Fatalf("got %q, want %q", got, want)
		}
	})

	t.Run("escapes a password with reserved characters", func(t *testing.T) {
		t.Setenv("DATABASE_URL", "")
		t.Setenv("DB_HOST", "h")
		t.Setenv("DB_USER", "u")
		t.Setenv("DB_PASSWORD", "p@ss/word?")
		t.Setenv("DB_NAME", "n")
		got, err := DatabaseURL()
		if err != nil {
			t.Fatal(err)
		}
		if strings.Contains(got, "p@ss/word?") {
			t.Fatalf("password not escaped: %q", got)
		}
	})

	t.Run("missing parts", func(t *testing.T) {
		t.Setenv("DATABASE_URL", "")
		t.Setenv("DB_HOST", "")
		t.Setenv("DB_USER", "")
		t.Setenv("DB_NAME", "")
		if _, err := DatabaseURL(); err == nil {
			t.Fatal("want an error when nothing is configured")
		}
	})
}
