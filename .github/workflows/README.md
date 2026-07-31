# CI/CD workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `frontend-ci.yml` | PR to `develop`, weekly cron, manual | Lint + type-check, then SAST and DAST on the frontend |
| `frontend-build.yml` | Push to `develop` | SAST, then build and push `ghcr.io/<repo>/frontend` |
| `reusable-sast.yml` | `workflow_call` | CodeQL, Semgrep, Trivy (dependencies, secrets, IaC/Dockerfile) |
| `reusable-dast.yml` | `workflow_call` | OWASP ZAP against a container the job starts, or a deployed URL |

Findings land in **Security → Code scanning** (SAST) and in the run's artifacts
plus job summary (DAST).

## reusable-sast.yml

Three independent jobs, each uploading SARIF under its own category so
`frontend` and `backend` alerts stay separate.

| Input | Default | Notes |
|---|---|---|
| `component` | — | Required. Names jobs, artifacts and SARIF categories |
| `working-directory` | `.` | Component root; scopes all three scanners |
| `run-codeql` / `run-semgrep` / `run-trivy` | `true` | Per-scanner toggles |
| `codeql-languages` | `["javascript-typescript"]` | JSON array, one matrix job each |
| `codeql-build-mode` | `none` | `autobuild`/`manual` for compiled languages |
| `codeql-queries` | `security-extended` | Query suite |
| `semgrep-configs` | `p/default p/secrets` | Space-separated rulesets |
| `semgrep-version` | `1.171.0` | Tag of `semgrep/semgrep` |
| `trivy-severity` | `CRITICAL,HIGH` | Severities reported |
| `fail-on-findings` | `false` | Fail the job on Semgrep/Trivy findings |

CodeQL is scoped with a `paths:` config, which applies to interpreted languages
only. For a compiled backend, use `source-root` instead.

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

## Adding the backend

NestJS is JavaScript/TypeScript, so SAST needs no new inputs. The API is best
scanned from its OpenAPI document rather than spidered.

```yaml
jobs:
  sast:
    uses: ./.github/workflows/reusable-sast.yml
    permissions:
      contents: read
      security-events: write
      actions: read
    with:
      component: backend
      working-directory: backend

  dast:
    uses: ./.github/workflows/reusable-dast.yml
    permissions:
      contents: read
    with:
      component: backend
      build-context: backend
      port: 3001
      health-path: /health
      scan-type: api
      api-definition-path: /api-json
    secrets:
      runtime-env-secrets: ${{ secrets.BACKEND_DAST_ENV }}
```

Infrastructure templates can reuse the same SAST workflow for IaC scanning:

```yaml
    with:
      component: infrastructure
      working-directory: infrastructure
      run-codeql: false
      run-semgrep: false
```

## Making the scans blocking

Every caller currently passes `fail-on-findings: false`, so scans report without
blocking. To enforce:

1. Clear or accept the open code scanning alerts (`npm audit fix` in `frontend/`
   covers the `@auth/core` advisories).
2. Set `fail-on-findings: true` in the caller.
3. For DAST, mark the alerts to enforce as `FAIL` in `.github/zap/rules.tsv`.
