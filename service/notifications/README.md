# RescuFood Notifications Service

Consumes one SQS queue. For each event it creates an **in-app notification**
and sends an **email**; both must land before the message is done. Producers
(`service/profile`, `service/listings`) publish a JSON message per notification
instead of calling SES/SMTP themselves - this is the one place that owns mail
credentials, templates, in-app records and delivery history.

**Stack:** NestJS 11 · TypeScript · Drizzle ORM · PostgreSQL (own database,
unlike `service/listings` which shares `profile`'s) · Amazon SQS · Gmail SMTP
(via `nodemailer`) - not SES, since sending "from" a domain you don't
control fails SPF/DKIM/DMARC at the recipient; Gmail's own servers send the
mail, authenticated as a real account.

## Read API

Cognito-bearer-authenticated, under `/api/notifications` (the caller is
identified by the token `sub`, matched against `recipient_user_id`):

| Route | Purpose |
|---|---|
| `GET /api/notifications?unreadOnly=&limit=&before=` | the caller's in-app notifications (newest first, keyset on `created_at`) plus `unreadCount` |
| `GET /api/notifications/unread-count` | `{ count }` for the unread dot |
| `POST /api/notifications/:id/read` | mark one read (404 if not the caller's) |
| `POST /api/notifications/read-all` | mark all read, returns `{ updated }` |
| `DELETE /api/notifications/:id` | dismiss one from the feed, 204 (404 if not the caller's) |
| `DELETE /api/notifications` | dismiss the whole feed, returns `{ deleted }` |

`GET /health` stays unauthenticated for container / ALB health checks.

The in-app feed is **capped at the newest 10** per recipient
(`IN_APP_FEED_LIMIT`). Dismissed notifications, and ones that fall past the
cap when a newer one arrives, are **soft-deleted** (`deleted_at`), not
removed - so the `(event_id, recipient_user_id)` dedupe index keeps blocking
duplicates if an event is reprocessed. The read API only ever returns
non-deleted rows, and there is no back-fill: dismissing one leaves the feed
shorter until the next notification arrives.

## Prerequisites

- **Node.js 20+** (developed on Node 24) and **npm**
- A running Postgres instance for this service's own `notifications`
  database (`compose.yaml` starts one on `localhost:5433`)
- An SQS queue to poll (`infrastructure/cloudformation/messaging.yaml`
  provisions `rescufood-<env>-notifications`) and AWS credentials that can
  receive/delete from it (default AWS SDK chain - a local profile/env vars
  in dev, the ECS task role when deployed)
- A Gmail account with 2FA enabled and an app password generated at
  https://myaccount.google.com/apppasswords

## Quick start

```sh
cd service/notifications
npm install
docker compose up -d          # local notifications-db on :5433
cp .env.example .env          # fill in NOTIFICATION_QUEUE_URL, AUTH_COGNITO_ISSUER, GMAIL_USER, GMAIL_APP_PASSWORD
npm run db:migrate
npm run start:dev
```

The service listens on **http://localhost:3003** and starts long-polling
the queue immediately on boot (`SqsConsumerService.onModuleInit`).

## Environment variables

See [`.env.example`](.env.example) for the full list. The notable ones:

| Variable | What it is |
|---|---|
| `DATABASE_URL` | This service's own database - see `compose.yaml` |
| `NOTIFICATION_QUEUE_URL` | `QueueUrl` output of the `rescufood-<env>-messaging` stack |
| `AWS_REGION` | Region for the SQS client |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Gmail account emails are sent through |
| `AUTH_COGNITO_ISSUER` | Cognito issuer URL the read API verifies bearer tokens against |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call the read API |

## Message contract

One SQS message body = one notification for one recipient:

```json
{
  "type": "claim_created",
  "channel": "email",
  "recipientEmail": "donor@example.com",
  "recipientUserId": "<cognito-sub>",
  "eventId": "claim:<claimId>:created",
  "payload": { "listingDescription": "Bread", "audience": "donor" }
}
```

`type` and `channel` are validated against the `notification_type`/
`notification_channel` enums in `src/db/schema.ts` - see
`src/notifications/notification-message.dto.ts`.

- **`recipientUserId`** (optional) - the recipient's Cognito sub. When present
  and the type has an in-app template (`src/notifications/in-app-templates.ts`),
  an `in_app` notification row is created.
- **`eventId`** (required) - a stable, per-recipient identifier for the domain
  event (e.g. `claim:<id>:created`). It is the key both channels de-duplicate
  on, so retries depend on it; a message without one fails validation.

`service/listings` publishes the claim / pickup / expiry events;
`service/profile` publishes `org_approved` (email only) and `user_welcome`
(in-app + email) - the latter the first time it provisions a user row.

## Delivery semantics

**Both channels must land.** For each message the consumer
(`SqsConsumerService.process`) attempts each in turn, then combines the two
outcomes - while either might still succeed, the message goes back on the
queue:

1. Creates the in-app row, treating a unique-violation on the
   `(event_id, recipient_user_id)` partial index as a duplicate (no-op), and
   trims the recipient's feed back to the newest `IN_APP_FEED_LIMIT`.
2. Sends the email. A prior successful send for the same `(event_id,
   recipient_email)` is skipped. A failure is written as a `status = 'failed'`
   row either way.

Redelivery is safe because both steps are idempotent: whichever channel
already succeeded is skipped, and only the outstanding one is retried.

Failures are classified. A **permanent** one deletes the message rather than
burning retries - bad JSON, failed validation, a type with no email template,
or an SMTP 5xx / rejected recipient (`PermanentDeliveryError`, raised by
`MailerService`). A **transient** one leaves the message for SQS to redeliver
(`maxReceiveCount: 5` → DLQ).

Because a permanent failure never reaches the DLQ, it is logged on its own as
`event: 'email.permanent_failure'`; the DLQ alarm in
`infrastructure/cloudformation/messaging.yaml` covers the exhausted-retry case.

`notifications` doubles as the delivery-audit / error log - `failed` email
rows accumulate, one per attempt; the partial unique indexes only constrain
successful rows.

## Testing

| Command | What it does |
|---|---|
| `npm test` | Unit tests |
| `npm run test:integration` | Repository, HTTP and `SqsConsumerService.process` tests against a throwaway Postgres (needs Docker) |

`npm run test:integration` (`test/integration/`, `*.integration-spec.ts`)
starts a real Postgres with [testcontainers](https://node.testcontainers.org/)
and applies this service's migrations directly as SQL - the schema is
self-contained, so no other service's migrations are needed. The JWT guard
is stubbed (a header carries the Cognito sub); the repository, controller and
SQS consumer run for real, the mailer is a spy. CI runs it as a separate
`integration` job in
[`notifications-ci.yml`](../../.github/workflows/notifications-ci.yml).
