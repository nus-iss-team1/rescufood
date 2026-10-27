# RescuFood

RescuFood replaces inefficient, fragmented communication (calls, chats, and spreadsheets) with a reliable, real-time digital workflow.
It ensures time-sensitive surplus food is discovered, claimed, and tracked seamlessly without double allocations or missed pickups.

A NUS-ISS Team 1 project.

## Stack

Two languages, split by component. Go for the identity service, TypeScript
everywhere else.

| Layer | Component | Language | Framework |
| --- | --- | --- | --- |
| Frontend | `web/platform` | TypeScript | Next.js 16, React 19, Tailwind 4 |
| Frontend | `web/admin-console` | TypeScript | React 19, Vite 8 |
| Backend | `service/profile` | Go 1.26 | chi |
| Backend | `service/listings` | TypeScript | NestJS 11, Drizzle ORM |
| Backend | `service/notifications` | TypeScript | NestJS 11, Drizzle ORM |

Shared TypeScript packages in `web/sdk` (typed API clients) and `web/ui`
(components) are compiled into both frontends.

| Concern | Choice |
| --- | --- |
| Database | PostgreSQL 17 |
| Identity | Amazon Cognito |
| Messaging | Amazon SQS |
| Infrastructure | AWS CloudFormation, ECS Fargate |
| Tests | Go test, Jest, Vitest, Playwright |

## Repository layout

| Folder                                              | What's in it                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`web/platform/`](web/platform/README.md)           | Next.js web client for donors and rescue partners (setup guide inside)        |
| [`web/admin-console/`](web/admin-console/README.md) | React SPA for platform administrators, run locally                            |
| `web/sdk/`                                          | Shared TypeScript clients for the profile and listings services               |
| `web/ui/`                                           | Shared shadcn/ui components used by both web apps                             |
| [`service/profile/`](service/profile)               | Go profile service — users, organisations, approval                           |
| [`service/listings/`](service/listings/README.md)   | NestJS listings service — listings CRUD, requests/claims, pickup verification |
| [`service/notifications/`](service/notifications/README.md) | NestJS notifications service — consumes the queue, sends email and serves the in-app notification feed |
| [`infrastructure/`](infrastructure/README.md)       | AWS CloudFormation stacks (network, security, identity, ECS, data, messaging) |
| [`docs/adr/`](docs/adr/README.md)                   | Architecture decision records                                                 |

## Quick start

```sh
cd web/platform
npm install
npm run dev
```

See [`web/platform/README.md`](web/platform/README.md) for environment setup and sign-in configuration.
