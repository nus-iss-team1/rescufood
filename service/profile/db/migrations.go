// Package db embeds the SQL migration files.
package db

import "embed"

//go:embed migrations/*.sql
var MigrationsFS embed.FS
