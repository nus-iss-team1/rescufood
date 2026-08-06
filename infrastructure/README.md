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
| `rescufood-dev-ecs` | `cloudformation/ecs.yaml` | Per environment |
| `rescufood-dev-data` | `cloudformation/data.yaml` | Per environment |

Planned future stacks follow the same pattern: `rescufood-core-dns`,
`rescufood-prod-security`, ...

Deploy order: network first — the security groups stack imports the VPC id
from the network stack's exports, and the ECS and data stacks import both.
The IAM stack (Cognito) has no VPC dependency and can be deployed
independently at any time.

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
`web/platform/.env.example`):

| Frontend env var | Source |
|---|---|
| `AUTH_COGNITO_ID` | `WebClientId` output |
| `AUTH_COGNITO_SECRET` | Managed client secret (Cognito console / CLI, not a stack output) |
| `AUTH_COGNITO_ISSUER` | `Issuer` output |

After deploying, register any non-localhost frontend URL by re-deploying
with `CallbackUrls`/`LogoutUrls` parameter overrides.

## Compute (ECS) stack

`cloudformation/ecs.yaml` provisions the per-environment compute tier:

- **ECS cluster** (`rescufood-<env>`) and a Fargate **frontend service**
  in the private app subnets (no public IP, image pulls via the NAT).
  The optional **profile service** shares the cluster and ALB — see
  below.
- **Internet-facing ALB** in the public subnets, forwarding to the
  container on port 3000. HTTP-only until `CertificateArn` is set, at
  which point 443 is served and 80 redirects to it.
- **Deployment circuit breaker** — a rollout whose tasks fail health
  checks rolls back automatically instead of looping.
- **ECS Exec** enabled — `aws ecs execute-command` opens a shell in a
  running task for debugging.

The service runs without a backend or database; the only runtime
dependency is Cognito, injected through the optional secrets below.

| Parameter | Default | Notes |
|---|---|---|
| `Image` | `ghcr.io/nus-iss-team1/rescufood/frontend:develop` | Pushed by `platform-build.yml` |
| `CertificateArn` | empty | ACM cert; empty = plain HTTP on 80 |
| `GhcrPullSecretArn` | empty | Only needed while the GHCR image is private |
| `AppSecretsArn` | empty | Empty = sign-in renders disabled |

Two optional Secrets Manager secrets, passed by ARN:

- **GHCR pull secret** (`GhcrPullSecretArn`) — needed only if the GHCR
  package is private. JSON: `{"username": "<github-username>",
  "password": "<PAT with read:packages>"}`. Making the package public
  (GitHub → Packages → frontend → settings) avoids this entirely.
- **App secrets** (`AppSecretsArn`) — one secret holding the four auth
  variables from `web/platform/.env.example` as JSON keys: `AUTH_SECRET`,
  `AUTH_COGNITO_ID`, `AUTH_COGNITO_SECRET`, `AUTH_COGNITO_ISSUER`.

Caveat while the ALB is HTTP-only: Cognito rejects non-HTTPS callback
URLs (localhost excepted), so the hosted-UI OAuth flow cannot be
registered against `http://<alb-dns>`. The username/password form does
not use a callback and works fine over HTTP.

The `Image` tag `develop` is mutable — CloudFormation sees no change
when a new image is pushed. The `deploy` job in
`.github/workflows/platform-build.yml` rolls the service onto each
newly pushed image and fails the run if the deployment circuit breaker
rolls it back. It authenticates with an access key stored in the repo
secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. To roll the
service manually instead:

```sh
aws ecs update-service \
  --region ap-southeast-1 \
  --cluster rescufood-dev \
  --service frontend \
  --force-new-deployment
```

## Profile service (in the ECS stack)

`cloudformation/ecs.yaml` also carries the Go profile service, gated on
`ProfileImage`: leave it empty and no profile resources are created.
When set it adds a Fargate service on port 3001, its own target group
and log group, and an ALB rule routing `/api/profile/*` to it.

| Parameter | Notes |
|---|---|
| `ProfileImage` | `ghcr.io/nus-iss-team1/rescufood/profile:develop` |
| `AuthCognitoIssuer` | `Issuer` output of the IAM stack |
| `ProfileDbName` | Database and role the service owns (`profile`) |
| `DataStackName` | Data stack whose database exports to import |

The service reads `DB_HOST`, `DB_PORT`, `DB_USER` and `DB_NAME` from the
task definition (imported from the data stack) and `DB_PASSWORD` from
Secrets Manager, then composes its own connection string. The password
lives in a secret this stack **generates** — nothing to create by hand,
and it never appears in a template, a parameter file or a log.

### One-time database bootstrap

Postgres roles, databases and tables are not CloudFormation resources —
no resource type reaches inside an instance. The stack therefore ships a
`rescufood-<env>-db-bootstrap` task definition that creates the role and
database using the RDS master credentials. Run it once per environment
(and again after rotating the generated password); it is idempotent:

```sh
subnets=$(aws cloudformation describe-stacks --region ap-southeast-1 \
  --stack-name rescufood-core-network \
  --query "Stacks[0].Outputs[?OutputKey=='AppSubnetIds'].OutputValue" \
  --output text)
sg=$(aws cloudformation describe-stacks --region ap-southeast-1 \
  --stack-name rescufood-dev-security \
  --query "Stacks[0].Outputs[?OutputKey=='AppSecurityGroupId'].OutputValue" \
  --output text)
net="awsvpcConfiguration={subnets=[$subnets],securityGroups=[$sg],\
assignPublicIp=DISABLED}"

aws ecs run-task --region ap-southeast-1 --cluster rescufood-dev \
  --task-definition rescufood-dev-db-bootstrap --launch-type FARGATE \
  --network-configuration "$net"
```

Watch it with
`aws logs tail /ecs/rescufood-dev/db-bootstrap --region ap-southeast-1`.

### Applying migrations

The service never migrates schema itself. Its image carries a `migrate`
binary, so schema changes run as the same task definition with the
command overridden — no tunnel and no local database client:

```sh
aws ecs run-task --region ap-southeast-1 --cluster rescufood-dev \
  --task-definition rescufood-dev-profile --launch-type FARGATE \
  --network-configuration "$net" \
  --overrides '{"containerOverrides":[{"name":"profile",
    "command":["/migrate","up"]}]}'
```

Run this **before** deploying code that needs the new schema: a rollout
reverts the code, never the database. Until `ProfileImage` is set, the
service and this task definition do not exist, and `profile-build.yml`
still builds and pushes the image but warns instead of deploying.

## Database (data) stack

`cloudformation/data.yaml` provisions the per-environment data tier:

- **RDS PostgreSQL** (`rescufood-<env>-db`) in the isolated data
  subnets — no public access, port 5432 reachable only from the app
  security group.
- **Managed master credentials** — RDS creates and rotates the master
  password in Secrets Manager; it never appears in a template or
  parameter file. The secret ARN is the `DbSecretArn` output (JSON
  keys `username`, `password`).
- **Encrypted gp3 storage**, 20 GiB autoscaling up to 100 GiB.
- **Backups** — 7 days of automated backups; deleting or replacing
  the instance takes a final snapshot (`DeletionPolicy: Snapshot`).

| Parameter | Default | Notes |
|---|---|---|
| `EngineVersion` | `17` | Major version; set `major.minor` to pin |
| `InstanceClass` | `db.t4g.micro` | ~US$13/month, ~US$15 with storage |
| `MultiAz` | `false` | Standby replica in the second AZ |
| `DeletionProtection` | `false` | Set `true` for prod |

The backend consumes the stack through the `DbEndpoint`, `DbPort`,
`DbName` and `DbSecretArn` exports, composing the connection string as
`postgresql://<username>:<password>@<endpoint>:<port>/<name>`. For prod,
override `MultiAz=true`, `DeletionProtection=true` and a larger instance
class in `parameters/data-prod.json`.

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

# 4. Dev environment compute (needs 1, 2, and a published frontend image)
aws cloudformation deploy \
  --region ap-southeast-1 \
  --stack-name rescufood-dev-ecs \
  --template-file cloudformation/ecs.yaml \
  --parameter-overrides file://cloudformation/parameters/ecs-dev.json \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset

# 5. Dev environment database (needs 1 and 2; takes ~10 minutes)
aws cloudformation deploy \
  --region ap-southeast-1 \
  --stack-name rescufood-dev-data \
  --template-file cloudformation/data.yaml \
  --parameter-overrides file://cloudformation/parameters/data-dev.json \
  --no-fail-on-empty-changeset
```

`CAPABILITY_NAMED_IAM` acknowledges the named task/execution roles the
ECS stack creates. The site URL is the stack's `FrontendUrl` output:

```sh
aws cloudformation describe-stacks \
  --region ap-southeast-1 \
  --stack-name rescufood-dev-ecs \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" \
  --output text
```

For prod later: copy each `parameters/*-dev.json` to a `*-prod.json`, set
`EnvironmentName=prod` (and a `:latest` or pinned image tag for ECS), then
deploy `rescufood-prod-security`, `rescufood-prod-iam` and
`rescufood-prod-ecs` the same way.

## Teardown

Delete in reverse order (security stacks before network — exports cannot be
deleted while imported):

```sh
aws cloudformation delete-stack --region ap-southeast-1 --stack-name rescufood-dev-ecs
aws cloudformation delete-stack --region ap-southeast-1 --stack-name rescufood-dev-data
aws cloudformation delete-stack --region ap-southeast-1 --stack-name rescufood-dev-iam
aws cloudformation delete-stack --region ap-southeast-1 --stack-name rescufood-dev-security
aws cloudformation delete-stack --region ap-southeast-1 --stack-name rescufood-core-network
```

Deleting the IAM stack deletes the user pool and all registered users —
fine for dev, deliberate decision required for prod (`DeletionProtection`
should be set to `ACTIVE` in the prod parameters when that time comes).

Deleting the data stack leaves a final snapshot behind (billed per GiB);
delete it from the RDS console once it is no longer needed.

Remember the NAT Gateway, its Elastic IP, the ALB, running Fargate tasks
and the RDS instance all bill hourly — tear down the ECS, data and
network stacks when not in use for extended periods.
