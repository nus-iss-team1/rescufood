# Admin console

React SPA for platform administrators: approve organisations, and
suspend or reactivate members. Every action requires a reason.

Uses [`@rescufood/profile-sdk`](../sdk) for the API and
[`@rescufood/ui`](../ui) for components. It is **not deployed** — run
it locally against the environment you are administering
([ADR 0001](../../docs/adr/0001-keep-the-admin-console-local.md)).

## Running it

```sh
npm install
cp ../.env.example ../.env   # fill in the values below
npm run dev                  # http://localhost:5173
```

| Variable | Value |
| --- | --- |
| `VITE_AWS_REGION` | `ap-southeast-1` |
| `VITE_COGNITO_CLIENT_ID` | `AdminConsoleClientId` from the IAM stack |
| `VITE_PROFILE_API_URL` | `http://localhost:3001`, or the ALB URL for deployed dev |

Both web apps share [`web/.env`](../.env.example); Vite reads it at boot,
so restart after editing it. Sign in with a Cognito account in the
`admin` group; the IAM stack seeds one.

Against a deployed environment, its `ExtraCorsOrigins` must list
`http://localhost:5173`.

## Checks

```sh
npm run build   # type-checks and bundles
npm run lint
```
