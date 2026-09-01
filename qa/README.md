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

| Variable                                                        | Value                                  |
| --------------------------------------------------------------- | -------------------------------------- |
| `BASE_URL`                                                      | Base URL of the environment under test |
| `TEST_DONOR_USERNAME` / `TEST_DONOR_PASSWORD`                   | A donor-org test account               |
| `TEST_RESCUE_PARTNER_USERNAME` / `TEST_RESCUE_PARTNER_PASSWORD` | A rescue-partner-org test account      |

All are required — the run fails immediately if any is unset.

`.env` is gitignored — never commit real credentials. Ask a teammate for values if you don't have test accounts yet.

## Running tests

Tests run against whatever `BASE_URL` points at — there is no default, so it must be set in `.env` (or the shell). Point it at the dev API Gateway for a normal run, or another environment to target that instead.

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

**Ask a repo admin to configure these** (Settings → Secrets and variables → Actions), matching the same values you use in your local `.env`:

- `BASE_URL` — as a **variable**
- `TEST_DONOR_USERNAME`, `TEST_DONOR_PASSWORD` — as **secrets**
- `TEST_RESCUE_PARTNER_USERNAME`, `TEST_RESCUE_PARTNER_PASSWORD` — as **secrets**

The run fails fast if any of these is missing.

One quirk worth knowing: GitHub only evaluates a `workflow_run`-triggered workflow using the copy of the file on the **default branch** (`develop`), not whatever's on a feature branch or PR. So this workflow won't actually start watching for deploys until it's merged — a copy sitting on a branch or open PR is inert for that trigger. The secrets and `BASE_URL` variable should ideally be in place by the time it merges, so the first real run doesn't fail on missing config.

Since it can't block anything by design, don't add it as a required branch-protection check — that would work against the point of it being non-blocking.
