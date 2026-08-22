# Rescufood Playwright QA

End-to-end tests for Rescufood, written with [Playwright](https://playwright.dev/).

## Setup

```
cd qa
npm install
npx playwright install   # downloads browser binaries, first time only
```

Copy `.env.example` to `.env` and fill in real test account credentials before running anything — the tests read these to log in, and will fail immediately without them:

```
cp .env.example .env
```

| Variable | Value |
| --- | --- |
| `TEST_DONOR_USERNAME` / `TEST_DONOR_PASSWORD` | A donor-org test account |
| `TEST_RESCUE_PARTNER_USERNAME` / `TEST_RESCUE_PARTNER_PASSWORD` | A rescue-partner-org test account |

`.env` is gitignored — never commit real credentials. Ask a teammate for values if you don't have test accounts yet.

## Running tests

By default, tests run against the dev environment (`rescufood-dev-alb-...`), configured in `playwright.config.ts`. To target a different environment, set `BASE_URL`.

```
npm test                          # run all tests headless
npm run test:headed               # run with a visible browser
npm run test:ui                   # run in Playwright's interactive UI mode
npx playwright test tests/login.spec.ts   # run a single spec file
```

## Test reports

After a run, view the HTML report with:

```
npx playwright show-report
```

## CI/CD

A ready-to-use workflow lives at [`.github/workflows/qa-test.yml`](../.github/workflows/qa-test.yml). It's a **post-deploy smoke check, not a gate**: it only starts after the `Build & Push Platform Image` workflow finishes deploying, and it never blocks that deploy or a PR merge — a failure just shows up red in the Actions tab and as an uploaded Playwright report, for someone to notice and follow up on. It can also be triggered manually from the Actions tab (`workflow_dispatch`) any time, without waiting for a deploy.

It's already written and works locally, but it needs one thing before it's actually live:

**Ask a repo admin to add these as GitHub Actions secrets** (Settings → Secrets and variables → Actions), matching the same values you use in your local `.env`:

- `TEST_DONOR_USERNAME`, `TEST_DONOR_PASSWORD`
- `TEST_RESCUE_PARTNER_USERNAME`, `TEST_RESCUE_PARTNER_PASSWORD`

One quirk worth knowing: GitHub only evaluates a `workflow_run`-triggered workflow using the copy of the file on the **default branch** (`develop`), not whatever's on a feature branch or PR. So this workflow won't actually start watching for deploys until it's merged — a copy sitting on a branch or open PR is inert for that trigger. The secrets should ideally be in place by the time it merges, so the first real run doesn't fail on empty credentials.

Since it can't block anything by design, don't add it as a required branch-protection check — that would work against the point of it being non-blocking.
