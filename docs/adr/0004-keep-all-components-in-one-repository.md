# 4. Keep all components in one repository

Status: accepted 2026-07-10, recorded 2026-10-27

## Decision

One repository partitioned by folder: `web/`, `service/`,
`infrastructure/`, `e2e/` and `docs/`.

## Rationale

ADR 0003 makes the services deploy independently, which usually means
one repository each. But both web clients share typed API clients and
UI components, and the listings integration suite depends on the
profile service's migrations. Split across repositories, those
dependencies would need publishing and version coordination.

## Consequences

- Nine workflows are path-filtered, so a commit builds only the
  components it touches.
- Cross-cutting changes land in one pull request.
- Shared packages are consumed through `file:` references, with no
  publishing step.
- Dependencies can be declared: `listings-ci` also triggers on
  `service/profile/db/migrations/**`.
- Tags apply to the repository, so there is no per-service version.
