# CI/CD workflows

Each deployable component (`platform`, `profile`, `listings`, `notifications`)
has a **CI** workflow and a **build** workflow, plus two reusable workflows and
a post-deploy e2e run.

| Workflow | Trigger | What it does |
|---|---|---|
| `platform-ci.yml` | PR to `develop` touching `web/**`, manual | Lint + type-check, SAST, DAST (ZAP baseline) |
| `profile-ci.yml` | PR to `develop` touching `service/profile/**`, manual | `gofmt` check, `go vet`, `go test -race`, SAST |
| `listings-ci.yml` | PR to `develop` touching `service/listings/**` or `service/profile/db/migrations/**`, manual | Lint, unit test, build, SAST, plus an integration job (testcontainers Postgres + profile/listings migrations) |
| `notifications-ci.yml` | PR to `develop` touching `service/notifications/**`, manual | Lint, test, build, SAST |
| `platform-build.yml` | Push to `develop` touching `web/**` | SAST → build & push `ghcr.io/<repo>/frontend` → roll the `web-platform` ECS service |
| `profile-build.yml` | Push to `develop` touching `service/profile/**` | SAST → build & push `.../profile` → roll the `profile` ECS service |
| `listings-build.yml` | Push to `develop` touching `service/listings/**` | SAST → build & push `.../listings` → roll the `listings` ECS service |
| `notifications-build.yml` | Push to `develop` touching `service/notifications/**` | SAST → build & push `.../notifications` → roll the `notification` ECS service (skipped with a warning if that service isn't deployed) |
| `qa-test.yml` | After **Build & Push Platform Image** completes, or manual | Playwright e2e against the deployed API Gateway URL. Post-deploy smoke check — never blocks anything |
| `reusable-sast.yml` | `workflow_call` | CodeQL, Semgrep, Trivy (dependencies, secrets, IaC/Dockerfile) |
| `reusable-dast.yml` | `workflow_call` | OWASP ZAP against a container the job starts, or a deployed URL |

The build workflows tag images `develop`, `develop-<sha>` and `latest`, then
`aws ecs update-service --force-new-deployment` (the `develop` tag is mutable)
and wait for the rollout, failing if the deployment circuit breaker rolls it
back. **CloudFormation is not touched** — infra stacks are deployed by hand
(see [`infrastructure/README.md`](../../infrastructure/README.md)).

Findings land in **Security → Code scanning** (SAST) and in the run's artifacts
plus job summary (DAST).

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
