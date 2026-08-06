# Admin console

React SPA for platform administrators: the organisation approval queue,
organisation detail with its members, and suspending or reactivating a
member. Every action requires a reason, which is kept on record.

It talks to the profile service through
[`@rescufood/profile-sdk`](../sdk) and shares components with the web
platform through [`@rescufood/ui`](../ui).

This app is **deliberately not deployed** — administrators run it
locally against whichever environment they are administering. See
[ADR 0001](../../docs/adr/0001-keep-the-admin-console-local.md).

## Running it

```sh
npm install
cp .env.example .env   # then fill in the values below
npm run dev            # http://localhost:5173
```

| Variable | Value |
| --- | --- |
| `VITE_AWS_REGION` | `ap-southeast-1` |
| `VITE_COGNITO_CLIENT_ID` | `AdminConsoleClientId` from the IAM stack |
| `VITE_API_BASE` | the profile service, see below |

`VITE_API_BASE` chooses the environment:

- local stack: `http://localhost:3001`, started with `make dev` from
  the repository root
- deployed dev: the ECS stack's `FrontendUrl` output, which serves
  `/api/profile/*` through the same load balancer

Restart the dev server after editing `.env` — Vite reads it at boot.

Sign in with a Cognito account in the `admin` group; the IAM stack
seeds one. A non-admin account reaches the console but sees only an
access-denied card, because the profile service gates every admin
endpoint on the token's admin claim.

## Notes

- The deployed profile service answers cross-origin requests only from
  origins it is configured to allow, so `http://localhost:5173` has to
  appear in that environment's `ExtraCorsOrigins`.
- The ID token lives in `sessionStorage` and lasts an hour; when it
  expires the console returns to the sign-in card with a notice.

## Checks

```sh
npm run build   # type-checks and bundles
npm run lint
```
