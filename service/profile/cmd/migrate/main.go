// Command migrate applies the embedded schema migrations to DATABASE_URL.
//
//	migrate [up|down|version]
package main

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/joho/godotenv"

	"github.com/nus-iss-team1/rescufood/service/profile/db"
)

func main() {
	_ = godotenv.Load()

	cmd := "up"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}

	src, err := iofs.New(db.MigrationsFS, "migrations")
	if err != nil {
		fail(err)
	}

	// The migrate pgx/v5 driver registers the pgx5 URL scheme.
	url := strings.Replace(os.Getenv("DATABASE_URL"), "postgres://", "pgx5://", 1)
	m, err := migrate.NewWithSourceInstance("iofs", src, url)
	if err != nil {
		fail(err)
	}
	defer m.Close()

	switch cmd {
	case "up":
		err = m.Up()
	case "down":
		// One step at a time; a full teardown must be deliberate.
		err = m.Steps(-1)
	case "version":
		v, dirty, verr := m.Version()
		if verr != nil {
			fail(verr)
		}
		fmt.Printf("version %d, dirty %t\n", v, dirty)
		return
	default:
		fail(fmt.Errorf("unknown command %q, want up, down or version", cmd))
	}

	switch {
	case errors.Is(err, migrate.ErrNoChange):
		fmt.Println("no change")
	case err != nil:
		fail(err)
	default:
		fmt.Println("ok")
	}
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "migrate:", err)
	os.Exit(1)
}
