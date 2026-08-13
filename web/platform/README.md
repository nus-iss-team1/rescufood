# RescuFood Frontend

The web client for RescuFood — a platform connecting surplus food from donor
organisations with rescue partners before it goes to waste.

**Stack:** Next.js 16 (App Router, standalone output) · TypeScript ·
Tailwind CSS v4 · shadcn/ui (Base library, Nova preset) · GSAP (animations +
smooth scrolling) · Auth.js v5 + AWS Cognito (username sign-in).

## Prerequisites

- **Node.js 20+** (developed on Node 24) and **npm**
- For working sign-in/sign-up: the **`rescufood-dev-iam`** CloudFormation
  stack deployed (see [`../infrastructure/README.md`](../infrastructure/README.md))
  and the **AWS CLI** configured — the signup flow calls Cognito admin APIs
  (role-group assignment, email uniqueness pre-check) with your local AWS
  credentials in dev.

The app runs without any env configuration too — pages render normally and
auth entry points are simply disabled.

## Quick start

```sh
cd platform
npm install
cp ../.env.example ../.env   # then fill in the values (next section)
npm run dev
```

Open http://localhost:3000. Use exactly `localhost:3000` (or `127.0.0.1:3000`)
— Cognito only accepts registered OAuth callback hosts, and the dev pool
registers those two.

## Environment variables

Both web apps share [`web/.env`](../.env.example) — copy
`web/.env.example` to `web/.env` (gitignored) and fill in:

| Variable | What it is | Where it comes from |
|---|---|---|
| `AUTH_SECRET` | Auth.js session encryption key | `openssl rand -base64 32` |
| `AUTH_COGNITO_ID` | Cognito app client id | `WebClientId` stack output |
| `AUTH_COGNITO_SECRET` | Cognito app client secret | Cognito console / CLI (below) |
| `AUTH_COGNITO_ISSUER` | OIDC issuer URL | `Issuer` stack output |
| `PROFILE_API_URL` | Profile service base URL | `http://localhost:3001` in dev |
| `LISTINGS_API_URL` | Listings service base URL | `http://localhost:3002` in dev |

Fetch everything from the deployed stack in one go:

```sh
REGION=ap-southeast-1
POOL=$(aws cloudformation describe-stacks --region $REGION --stack-name rescufood-dev-iam \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
CLIENT=$(aws cloudformation describe-stacks --region $REGION --stack-name rescufood-dev-iam \
  --query "Stacks[0].Outputs[?OutputKey=='WebClientId'].OutputValue" --output text)
ADMIN=$(aws cloudformation describe-stacks --region $REGION --stack-name rescufood-dev-iam \
  --query "Stacks[0].Outputs[?OutputKey=='AdminConsoleClientId'].OutputValue" --output text)
ISSUER=$(aws cloudformation describe-stacks --region $REGION --stack-name rescufood-dev-iam \
  --query "Stacks[0].Outputs[?OutputKey=='Issuer'].OutputValue" --output text)
SECRET=$(aws cognito-idp describe-user-pool-client --region $REGION \
  --user-pool-id "$POOL" --client-id "$CLIENT" \
  --query "UserPoolClient.ClientSecret" --output text)

printf 'AUTH_SECRET=%s\nAUTH_COGNITO_ID=%s\nAUTH_COGNITO_SECRET=%s\nAUTH_COGNITO_ISSUER=%s\nPROFILE_API_URL=http://localhost:3001\nLISTINGS_API_URL=http://localhost:3002\n\nVITE_AWS_REGION=%s\nVITE_COGNITO_CLIENT_ID=%s\nVITE_PROFILE_API_URL=http://localhost:3001\n' \
  "$(openssl rand -base64 32)" "$CLIENT" "$SECRET" "$ISSUER" "$REGION" "$ADMIN" > ../.env
```

> The IAM stack is replaced (not updated) for certain pool changes — if
> sign-in suddenly fails after an infra change, re-run the snippet above to
> pick up the new pool/client values.

## Authentication

- **Sign in** (`/login`): username + password, via an Auth.js Credentials
  provider that calls Cognito's `USER_PASSWORD_AUTH` flow server-side.
- **Sign up** (`/signup`): username, full name, email, password, and a role
  (food donor / rescue partner). Cognito emails a verification code;
  accounts can't sign in until it's confirmed. Usernames are unique by
  nature; verified emails are unique pool-wide (email alias) with a
  friendly pre-check at signup.
- **Roles** land in the session as `session.user.groups`
  (`donor` / `rescue-partner` / `admin`).
- A **superadmin** (`admin`) is bootstrapped by the IAM stack itself — the
  credentials live in `infrastructure/cloudformation/parameters/iam-dev.json`.
- Signed-in users land on **`/dashboard`**; anonymous visits there redirect
  home.

Create additional dev test users from the CLI (email pre-verified):

```sh
aws cognito-idp admin-create-user --region ap-southeast-1 --user-pool-id "$POOL" \
  --username testdonor --message-action SUPPRESS \
  --user-attributes Name=email,Value=you@example.com Name=email_verified,Value=true Name=name,Value="Test Donor"
aws cognito-idp admin-set-user-password --region ap-southeast-1 --user-pool-id "$POOL" \
  --username testdonor --password 'YourPassw0rd' --permanent
aws cognito-idp admin-add-user-to-group --region ap-southeast-1 --user-pool-id "$POOL" \
  --username testdonor --group-name donor
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload on port 3000 |
| `npm run build` | Production build (standalone output) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

If styling ever looks mysteriously stale in dev, clear the Turbopack cache:
`rm -rf .next` and restart.

## Docker

The Dockerfile builds a slim three-stage image (Next.js standalone, non-root
user, port 3000):

```sh
docker build -t rescufood-frontend .
docker run --rm -p 3000:3000 --env-file ../.env rescufood-frontend
```

CI builds and pushes the image to GHCR
(`ghcr.io/nus-iss-team1/rescufood/frontend`) on every push to `develop`
that touches `web/platform/**` — see
[`.github/workflows/platform-build.yml`](../../.github/workflows/platform-build.yml).

## Project structure

```text
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/ · signup/      # Auth pages (forms in components/auth/)
│   ├── dashboard/            # Signed-in landing page
│   ├── api/auth/[...nextauth]/ # Auth.js route handlers
│   └── actions.ts            # Server actions (login, signup, sign-out)
├── auth.ts                   # Auth.js config (Cognito OAuth + Credentials)
├── lib/cognito.ts            # Cognito SDK helpers (server-only)
└── components/
    ├── ui/                   # shadcn components (restyled to house theme)
    ├── auth/                 # Login / signup form components
    ├── site-header.tsx       # Fixed header + responsive nav
    ├── header-menu.tsx       # Mobile drawer menu (signed-in)
    ├── smooth-scroll.tsx     # GSAP ScrollSmoother wrapper
    └── animate-in.tsx        # Calm entrance animation helper
```

## Design conventions

The theme is a warm, Bonsai-inspired design system: color tokens live in
`src/app/globals.css` (never hardcode colors — use the semantic Tailwind
classes), Geist is wired as `--font-sans`, buttons are pills, cards use a
soft diffuse shadow, and sections separate with full-bleed tinted bands
rather than divider lines. Keep new UI consistent with these conventions,
verify light **and** dark mode, and keep GSAP motion subtle (fade-up,
ease-out, under ~1.2s).
