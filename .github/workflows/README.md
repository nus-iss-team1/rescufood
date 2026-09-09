# CI/CD workflows

Each deployable component (`platform`, `profile`, `listings`, `notifications`)
has a **CI** workflow and a **build** workflow, plus two reusable workflows and
a post-deploy e2e run.

## Branching model

One long-lived branch per deployed environment. Promotion is a pull request
whose diff is everything merged since the last promotion — no cherry-picking,
no release branches.

```
feat/* fix/* ──PR──▶ develop ──PR──▶ qa
                        │             │
                        ▼             ▼
                   rescufood-dev  rescufood-qa
```

| Branch | Environment | Stacks | Image tag |
|---|---|---|---|
| `develop` | dev | `rescufood-dev-*` | `develop` |
| `qa` | qa | `rescufood-qa-*` | `qa` |

A push to either branch builds only the components whose paths changed and
rolls only that environment's ECS services. `main` is reserved for a
production environment that does not exist yet.

A hotfix branches off the environment branch that is broken and is merged
back down to `develop` afterwards, so the next promotion does not revert it.

Creating a branch builds nothing — a branch-creation push carries no file
diff, so every `paths:` filter misses. Seed a new environment's images with
the manual trigger instead: **Actions → the build workflow → Run workflow**,
with the branch selected.

## Workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `platform-ci.yml` | PR to `develop` touching `web/**`, manual | Lint + type-check, SAST, DAST (ZAP baseline) |
| `profile-ci.yml` | PR to `develop` touching `service/profile/**`, manual | `gofmt` check, `go vet`, `go test -race`, SAST, plus an integration job (testcontainers Postgres; runs unit + integration together for a combined coverage report in the job summary) |
| `listings-ci.yml` | PR to `develop` touching `service/listings/**` or `service/profile/db/migrations/**`, manual | Lint, unit test, build, SAST, plus an integration job (testcontainers Postgres + profile/listings migrations; posts a combined unit+integration coverage report to the job summary) |
| `notifications-ci.yml` | PR to `develop` touching `service/notifications/**`, manual | Lint, unit test, build, SAST, plus an integration job (testcontainers Postgres + notifications migrations; posts a combined unit+integration coverage report to the job summary) |
| `platform-build.yml` | Push to `develop` or `qa` touching `web/**`, manual | SAST → build & push `ghcr.io/<repo>/frontend` → roll the `web-platform` ECS service |
| `profile-build.yml` | Push to `develop` or `qa` touching `service/profile/**`, manual | SAST → build & push `.../profile` → roll the `profile` ECS service |
| `listings-build.yml` | Push to `develop` or `qa` touching `service/listings/**`, manual | SAST → build & push `.../listings` → roll the `listings` ECS service |
| `notifications-build.yml` | Push to `develop` or `qa` touching `service/notifications/**`, manual | SAST → build & push `.../notifications` → roll the `notification` ECS service (skipped with a warning if that service isn't deployed) |
| `e2e-test.yml` | After **Build & Push Platform Image** completes, or manual | Playwright e2e against the deployed API Gateway URL. Post-deploy smoke check — never blocks anything |
| `reusable-sast.yml` | `workflow_call` | CodeQL, Semgrep, Trivy (dependencies, secrets, IaC/Dockerfile) |
| `reusable-dast.yml` | `workflow_call` | OWASP ZAP against a container the job starts, or a deployed URL |

The build workflows tag images `<branch>`, `<branch>-<sha>` and — on `develop`
only — `latest`, then `aws ecs update-service --force-new-deployment` (the
branch tag is mutable) and wait for the rollout, failing if the deployment
circuit breaker rolls it back. **CloudFormation is not touched** — infra
stacks are deployed by hand
(see [`infrastructure/README.md`](../../infrastructure/README.md)).

Findings land in **Security → Code scanning** (SAST) and in the run's artifacts
plus job summary (DAST).

## Coverage

Each backend service's `integration` job runs its unit and integration suites
with coverage and posts a merged unit+integration table to the run's **job
summary**. It is **report-only** — a drop is visible on the PR but does not
fail the build.

The same commands run locally (they need Docker):

- `make coverage` — all three backend services
- listings / notifications: `npm run test:coverage` (merges the two Jest JSON
  reports via `scripts/coverage-summary.mjs`)
- profile: `bash scripts/coverage.sh` (`go test -tags=integration ./...` once,
  so `-coverpkg` attributes store coverage from the `integration` package)

To make it blocking, add a threshold check to those scripts.

## GitHub Environments

Each deploy job runs under a GitHub Environment named after its target
(`dev` or `qa`), resolved from the branch. Configure both under
**Settings → Environments**:

| Setting | Kind | Used by |
|---|---|---|
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Secret | The deploy job |
| `BASE_URL` | Variable | `e2e-test.yml` |
| `TEST_DONOR_*`, `TEST_RESCUE_PARTNER_*` | Secret | `e2e-test.yml` |

Repository-level secrets still apply wherever an environment defines none, so
`dev` keeps working with the existing repository secrets and only `qa` needs
filling in. Give `qa` its own `BASE_URL` and test accounts — each environment
has a separate Cognito user pool, so dev's accounts do not exist in qa.

Adding required reviewers to an environment turns its deploys into a gated
promotion. That is how prod will be protected when `main` is wired up.

## reusable-sast.yml

Three independent jobs, each uploading SARIF under its own category so each
component's alerts stay separate.

| Input | Default | Notes |
|---|---|---|
| `component` | — | Required. Names jobs, artifacts and SARIF categories |
| `working-directory` | `.` | Component root; scopes all three scanners |
| `run-codeql` / `run-semgrep` / `run-trivy` | `true` | Per-scanner toggles |
| `codeql-languages` | `["javascript-typescript"]` | JSON array, one matrix job each |
| `codeql-build-mode` | `none` | `autobuild`/`manual` for compiled languages (profile uses `autobuild`) |
| `codeql-paths` | `""` (= `working-directory`) | Narrow when a wider tree makes the analysis time out — `platform` scopes to `web/platform` |
| `codeql-queries` | `security-extended` | Query suite |
| `semgrep-configs` | `p/default p/secrets` | Space-separated rulesets — services add `p/nodejs` / `p/golang` |
| `semgrep-version` | `1.171.0` | Tag of `semgrep/semgrep` |
| `trivy-severity` | `CRITICAL,HIGH` | Severities reported |
| `fail-on-findings` | `false` | Fail the job on Semgrep/Trivy findings |

CodeQL is scoped with a `paths:` config, which applies to interpreted languages
only. For a compiled component, use `source-root` instead.

## reusable-dast.yml

Builds the component image, runs it on the runner, waits for `health-path`, then
runs ZAP. Set `target-url` to scan a deployed environment instead — then nothing
is built or started.

| Input | Default | Notes |
|---|---|---|
| `component` | — | Required |
| `target-url` | `""` | Scan this base URL instead of an ephemeral container |
| `build-context` | `""` | Docker build context; required unless `target-url`/`image` is set |
| `dockerfile` | `<build-context>/Dockerfile` | Dockerfile path |
| `image` | `""` | Run an existing image instead of building |
| `port` | `3000` | Published port, also passed as `PORT` |
| `health-path` | `/` | Polled until 2xx, 120s budget |
| `scan-path` | `/` | Where the spider starts |
| `scan-type` | `baseline` | `baseline`, `full` (active attacks) or `api` |
| `api-format` / `api-definition-path` | `openapi` / `/openapi.json` | For `scan-type: api` |
| `rules-file` | `.github/zap/rules.tsv` | Alert handling; ignored if absent |
| `cmd-options` | `-I` | `-I` = warnings do not fail. `-j` adds the AJAX spider for client-rendered routes; it needs a working browser in the ZAP image and crashes on arm64 |
| `runtime-env` | `""` | Container env, one `KEY=VALUE` per line |
| `fail-on-findings` | `false` | Fail on alerts marked `FAIL` in `rules-file` |

Secret container env goes through the `runtime-env-secrets` secret, same format.

## Adding a component

Copy an existing pair, e.g. `notifications-ci.yml` + `notifications-build.yml`,
and change the `paths:` filters, `working-directory`, image name, ECS
`SERVICE`, and the SAST `component` / `semgrep-configs` (`p/nodejs` for a
NestJS service, `p/golang` + `codeql-build-mode: autobuild` for Go). A service
whose API is worth scanning can call `reusable-dast.yml` with
`scan-type: api` and `api-definition-path` pointed at its OpenAPI document.

## Making the scans blocking

Every caller currently passes `fail-on-findings: false`, so scans report without
blocking. To enforce:

1. Clear or accept the open code scanning alerts.
2. Set `fail-on-findings: true` in the caller.
3. For DAST, mark the alerts to enforce as `FAIL` in `.github/zap/rules.tsv`.
