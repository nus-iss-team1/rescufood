# RescuFood Infrastructure

AWS CloudFormation templates for the RescuFood platform.
Region: **ap-southeast-1** (Singapore).

## Architecture

One VPC (`10.0.0.0/16`) shared by dev and prod, spanning 2 AZs:

| Tier | AZ-a | AZ-b | Internet path | Hosts |
|---|---|---|---|---|
| Public | 10.0.0.0/24 | 10.0.1.0/24 | Internet Gateway | ALB, NAT Gateway |
| App (private) | 10.0.10.0/24 | 10.0.11.0/24 | outbound via NAT | ECS Fargate tasks |
| Data (isolated) | 10.0.20.0/24 | 10.0.21.0/24 | none | RDS PostgreSQL |

A single NAT Gateway (in public AZ-a) serves both app subnets — an accepted
single point of failure to keep cost down (~US$35/month). The data tier has
no route to the internet at all.

Environment separation (dev vs prod) inside the shared VPC is logical:
per-environment security groups, ECS services, and databases, tagged with
`Environment: dev|prod`.

Security group chain per environment:

```
internet → alb-sg (80/443) → app-sg (3000 web, 3001 api) → db-sg (5432)
```

## Stacks

Stack naming convention: **`rescufood-<scope>-<component>`**, where scope is
`core` for resources used by every environment, or the environment name
(`dev`, `prod`) for per-environment resources. The CloudFormation console
sorts alphabetically, so all project stacks group under `rescufood-` and
then cluster by scope.

| Stack name | Template | Scope |
|---|---|---|
| `rescufood-core-network` | `cloudformation/network.yaml` | Core (deploy once) |
| `rescufood-dev-security` | `cloudformation/security-groups.yaml` | Per environment |
| `rescufood-dev-iam` | `cloudformation/iam.yaml` | Per environment |

Planned future stacks follow the same pattern: `rescufood-core-dns`,
`rescufood-dev-data`, `rescufood-dev-ecs`, `rescufood-prod-security`, ...

Deploy order: network first — the security groups stack imports the VPC id
from the network stack's exports. The IAM stack (Cognito) has no VPC
dependency and can be deployed independently at any time.

## Identity (IAM) stack

`cloudformation/iam.yaml` provisions the per-environment identity service:

- **Cognito User Pool** (`rescufood-<env>-users`) — email sign-in,
  self-signup enabled (admins approve organisations at the application
  level per FR1), verified-email recovery, 12-char minimum passwords.
- **Hosted UI domain** — `rescufood-<env>.auth.ap-southeast-1.amazoncognito.com`.
- **Web app client** — confidential client (secret generated) using the
  OAuth authorization-code flow with `openid email profile` scopes; the
  frontend's Auth.js handles the server-side code exchange.
- **Role groups** — `donor`, `rescue-partner`, `admin`; group membership
  is included in tokens (`cognito:groups` claim) for role checks.

The frontend consumes the stack via environment variables (see
`frontend/.env.example`):

| Frontend env var | Source |
|---|---|
| `AUTH_COGNITO_ID` | `WebClientId` output |
| `AUTH_COGNITO_SECRET` | Managed client secret (Cognito console / CLI, not a stack output) |
| `AUTH_COGNITO_ISSUER` | `Issuer` output |

After deploying, register any non-localhost frontend URL by re-deploying
with `CallbackUrls`/`LogoutUrls` parameter overrides.

## Deploying (not yet executed)

All deploy commands are idempotent: `aws cloudformation deploy` creates the
stack on first run and updates it on later runs, and
`--no-fail-on-empty-changeset` makes a no-change re-run exit 0 instead of
erroring — safe to run repeatedly, locally or in CI.

```sh
# 1. Shared network foundation
aws cloudformation deploy \
  --region ap-southeast-1 \
  --stack-name rescufood-core-network \
  --template-file cloudformation/network.yaml \
  --no-fail-on-empty-changeset

# 2. Dev environment security groups
aws cloudformation deploy \
  --region ap-southeast-1 \
  --stack-name rescufood-dev-security \
  --template-file cloudformation/security-groups.yaml \
  --parameter-overrides file://cloudformation/parameters/dev.json \
  --no-fail-on-empty-changeset

# 3. Dev environment identity service (independent of 1 and 2)
aws cloudformation deploy \
  --region ap-southeast-1 \
  --stack-name rescufood-dev-iam \
  --template-file cloudformation/iam.yaml \
  --parameter-overrides file://cloudformation/parameters/iam-dev.json \
  --no-fail-on-empty-changeset
```

For prod later: copy `parameters/dev.json` to `parameters/prod.json`, set
`EnvironmentName=prod`, and deploy a `rescufood-prod-security` stack.

## Teardown

Delete in reverse order (security stacks before network — exports cannot be
deleted while imported):

```sh
aws cloudformation delete-stack --region ap-southeast-1 --stack-name rescufood-dev-iam
aws cloudformation delete-stack --region ap-southeast-1 --stack-name rescufood-dev-security
aws cloudformation delete-stack --region ap-southeast-1 --stack-name rescufood-core-network
```

Deleting the IAM stack deletes the user pool and all registered users —
fine for dev, deliberate decision required for prod (`DeletionProtection`
should be set to `ACTIVE` in the prod parameters when that time comes).

Remember the NAT Gateway and its Elastic IP bill hourly — tear down the
network stack when not in use for extended periods.
