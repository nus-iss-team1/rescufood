# 6. Run the end-to-end suite against dev and qa only

Status: accepted 2026-08-22, recorded 2026-10-27

## Decision

The suite runs against dev and qa. The workflow excludes `main` and
maps the branch to the qa or dev environment, so there is no path to
production.

## Rationale

The Playwright suite is not read-only. It posts listings, claims them
and completes pickups, so running it after a production deploy would
write test records into live data and distort the rescued-food figures
the platform reports.

## Consequences

- Live data stays free of test records.
- Each environment has its own Cognito pool, so dev and qa runs do
  not collide.
- Production gets no automated post-deploy verification. A deploy
  that breaks the application is not caught here.

Revisit with a separate read-only smoke suite: sign in, load the
browse page, assert the API answers.
