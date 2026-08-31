# RescuFood Listings Service

The listings service — food listing and pickup-request lifecycle for donor
and rescue organisations: listing CRUD, requests/claims, and pickup-code
verification.

**Stack:** NestJS 11 · TypeScript · Drizzle ORM · PostgreSQL (shared with
`service/profile`) · S3-backed image storage · Cognito-issued JWTs.

## Prerequisites

- **Node.js 20+** (developed on Node 24) and **npm**
- A running Postgres instance with `service/profile`'s schema applied —
  listings/requests/audit_log reference `organisations`/`users`
  via plain FK columns (see `src/db/external.schema.ts`), so the profile
  service's migrations must run first.
- AWS credentials that can reach the target S3 bucket (default AWS SDK
  chain — a local profile/env vars in dev, the ECS task role when deployed).

## Quick start

```sh
cd service/listings
npm install
cp .env.example .env   # fill in AUTH_COGNITO_ISSUER and S3_BUCKET_NAME
npm run db:migrate
npm run start:dev
```

Or run everything (profile, listings, both web apps) together from the repo
root with `make dev` — see the root [`Makefile`](../../Makefile). The service
listens on **http://localhost:3002**, with Swagger docs at
`/api/listings/docs` (not exposed publicly — same trust boundary as the
service itself).

## Environment variables

See [`.env.example`](.env.example) for the full list with defaults. The
notable ones:

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Shared with `service/profile`; `profile` database, `profile` role |
| `AUTH_COGNITO_ISSUER` | OIDC issuer URL — `Issuer` output of the `rescufood-<env>-iam` stack |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call the API |
| `AWS_REGION` / `S3_BUCKET_NAME` | Where listing images are uploaded (`src/storage/s3.service.ts`) |
| `LISTING_IMAGES_CDN_URL` | CloudFront base URL prefixed to image keys in API responses |
| `NOTIFICATION_QUEUE_URL` | SQS queue for lifecycle notifications; unset = notifications disabled (logged once) |
| `RATE_LIMIT_TTL_SECONDS` / `RATE_LIMIT_MAX_REQUESTS` | App-wide throttle, default 100 req/60s/client |
| `IDEMPOTENCY_RETENTION_DAYS` | How long claim idempotency records are kept before a reused key counts as new, default 7 |

## API

All routes are namespaced under `/api` (`app.setGlobalPrefix('api')` in
`src/main.ts`):

| Resource | Routes |
|---|---|
| `/api/listings` | `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| `/api/requests` | `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `POST /:id/pickup-code`, `POST /:id/verify` |
| `/api/health` | Health check — the ECS target group's health check path |

Requests carry a Cognito-issued bearer token; org membership and
listing/request ownership are enforced per-route (see
`src/auth/org-membership.guard.ts` and the `*-access.util.ts` helpers).

### Lifecycle notifications

After a claim, cancellation, pickup reminder/completion or listing expiry
commits, `NotificationsPublisher` (`src/notifications/`) sends one SQS
message per recipient to `NOTIFICATION_QUEUE_URL` — carrying a deterministic
`eventId` and the recipient's Cognito sub — which `service/notifications`
turns into an email and an in-app notification. Best-effort: the send runs
after the transaction and a failure is only logged.

### Claim idempotency

`POST /api/requests` requires an `idempotencyKey` (client-generated, unique
per rescue org). The service records the key, a fingerprint of the request,
and its outcome in `request_idempotency_keys`:

- **Identical retry** → the original claim is returned, no second claim
  created — even after the listing has left `available`.
- **Same key, different listing** → `409` idempotency conflict; the existing
  claim is untouched and a `claim.idempotency_conflict` audit row is written.
- **Retry while the first request is still in flight** → `409` asking the
  caller to retry; the concurrent unique index guarantees at most one claim
  commits.
- **Isolation** → the key is scoped to the rescue org, so two orgs can use
  the same key value without interfering.
- **Retention** → records are pruned once past `IDEMPOTENCY_RETENTION_DAYS`
  (abandoned in-flight records after 15 min) by `IdempotencyRetentionService`;
  after that the key is treated as new.

See [ADR 0002](../../docs/adr/0002-claim-idempotency.md).

## Database

Migrations are managed with Drizzle Kit (`drizzle.config.ts`,
`db/migrations/`):

```sh
npm run db:generate   # generate a migration from schema changes
npm run db:migrate    # apply migrations (local DATABASE_URL)
```

Against the deployed RDS instance, use
[`scripts/migrate-rds.sh`](scripts/migrate-rds.sh) instead — it tunnels
through SSM to reach the private DB and runs migrations from a developer
machine. See the comments in that script and in `Dockerfile` for why: the
production image intentionally ships without `drizzle-kit` or the `db/`
folder, since migrations never run from inside the container.

## Scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | Dev server with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm run lint` | ESLint (`--fix`) |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |

## Docker

The Dockerfile builds a four-stage image (deps → build → prod-deps →
runtime), non-root user, port 3002:

```sh
npm run docker:build
npm run docker:run
```

CI builds and pushes the image to GHCR
(`ghcr.io/nus-iss-team1/rescufood/listings`) on every push to `develop`
that touches `service/listings/**` — see
[`.github/workflows/listings-build.yml`](../../.github/workflows/listings-build.yml).

## Project structure

```text
src/
├── main.ts                 # Bootstrap, global prefix, Swagger, CORS
├── app.module.ts
├── auth/                    # JWT guard + org-membership guard
├── db/                      # Drizzle schema (own + external/profile tables)
├── listings/                # Listings CRUD, image upload, expiry job
├── requests/                # Request/claim lifecycle, pickup-code verification, idempotency
├── notifications/           # SQS publisher for lifecycle notifications
├── audit/                   # audit_log writer for the listing/claim lifecycle
├── storage/                 # S3 upload service
└── health/                  # Health check controller
```
