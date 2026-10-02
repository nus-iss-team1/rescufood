# Admin console

React SPA for platform administrators: approve organisations, suspend or
reactivate members, and read the audit log. Every action requires a
reason.

Uses [`@rescufood/profile-sdk`](../sdk/profile) and
[`@rescufood/listings-sdk`](../sdk/listings) for the APIs and
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
| `VITE_LISTINGS_API_URL` | `http://localhost:3002`, or the ALB URL for deployed dev |

Both web apps share [`web/.env`](../.env.example); Vite reads it at boot,
so restart after editing it. Sign in with a Cognito account in the
`admin` group; the IAM stack seeds one.

Against a deployed environment, its `ExtraCorsOrigins` must list
`http://localhost:5173`.

## Audit log

The **Audit log** tab reads `service/listings`, which owns `audit_log`.
It opens unfiltered and newest first, so an investigation can start from
a time rather than from an entity id, then narrows by entity type, actor
or date range. Clicking a row opens that listing's or claim's full
history, oldest first.

Two things worth knowing when reading it:

- The audit API returns actor **ids**, not names - it deliberately joins
  nothing. Names are resolved separately through the profile service,
  one call per organisation the loaded events mention, and a failed
  lookup falls back to a short id rather than breaking the table.
- The actor dropdown can only offer actors seen in results loaded so
  far, because the API has no facet endpoint. Paging through widens it.

Against a deployed environment this needs `/api/audit` reachable, which
the listings ALB rule covers (priority 13, see
[`infrastructure/README.md`](../../infrastructure/README.md)).

## Checks

```sh
npm run build   # type-checks and bundles
npm run lint
```
