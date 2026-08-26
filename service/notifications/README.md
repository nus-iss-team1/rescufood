# RescuFood Notifications Service

Consumes one SQS queue and sends the actual email. Producers (`service/profile`,
later `service/listings`) publish a JSON message per notification instead of
calling SES/SMTP themselves - this is the one place that owns mail credentials,
templates and delivery history.

**Stack:** NestJS 11 · TypeScript · Drizzle ORM · PostgreSQL (own database,
unlike `service/listings` which shares `profile`'s) · Amazon SQS · Gmail SMTP
(via `nodemailer`) - not SES, since sending "from" a domain you don't
control fails SPF/DKIM/DMARC at the recipient; Gmail's own servers send the
mail, authenticated as a real account.

No public HTTP API yet - `GET /health` is the only route, for ECS container
health checks. A `channel: 'in_app'` message is recorded but nothing serves
it back to a browser yet; that's future work, not this commit.

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
cp .env.example .env          # fill in NOTIFICATION_QUEUE_URL, GMAIL_USER, GMAIL_APP_PASSWORD
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

## Message contract

One SQS message body = one notification:

```json
{
  "type": "org_approved",
  "channel": "email",
  "recipientEmail": "ops@freshmart.sg",
  "payload": { "orgName": "Fresh Mart" }
}
```

`type` and `channel` are validated against the `notification_type`/
`notification_channel` enums in `src/db/schema.ts` - see
`src/notifications/notification-message.dto.ts`. Only `org_approved` has an
email template today (`src/notifications/templates.ts`); every other
`notification_type` value is reserved for when `service/listings` starts
publishing claim/pickup events.

## Delivery semantics

SQS owns retries, not the database: the queue's redrive policy
(`maxReceiveCount: 5` in `messaging.yaml`) redelivers a message that fails
until it's moved to the dead-letter queue. `notifications` is a pure
delivery-audit table - one row per attempt, `status` is `sent` or `failed`,
written after the attempt completes (see `SqsConsumerService.process` in
`src/notifications/sqs-consumer.service.ts`).

A message is deleted from the queue (no further retries) when:

- it sent successfully, or
- it's unrecoverable - malformed JSON/failed validation, or a well-formed
  message of a `notification_type` with no template yet

It's left in place (SQS will redeliver it) when the failure looks
transient - an SMTP or database error - so a temporary outage doesn't lose
the notification.
