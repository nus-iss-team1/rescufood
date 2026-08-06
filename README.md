# RescuFood

RescuFood replaces inefficient, fragmented communication (calls, chats, and spreadsheets) with a reliable, real-time digital workflow.
It ensures time-sensitive surplus food is discovered, claimed, and tracked seamlessly without double allocations or missed pickups.

A NUS-ISS Team 1 project.

## Repository layout

| Folder | What's in it |
| --- | --- |
| [`web/platform/`](web/platform/README.md) | Next.js web client for donors and rescue partners (setup guide inside) |
| `web/admin-console/` | React SPA for platform administrators |
| `web/sdk/` | Shared TypeScript client for the profile service |
| `web/ui/` | Shared shadcn/ui components used by both web apps |
| [`service/profile/`](service/profile) | Go profile service — users, organisations, approval |
| [`infrastructure/`](infrastructure/README.md) | AWS CloudFormation stacks (network, security, identity, ECS, data) |

## Quick start

```sh
cd web/platform
npm install
npm run dev
```

See [`web/platform/README.md`](web/platform/README.md) for environment setup and sign-in configuration.
