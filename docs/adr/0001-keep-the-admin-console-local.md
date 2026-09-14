# 1. Keep the admin console local

Status: accepted, 2026-08-06

## Context

Deploying the console would add a Fargate task, a target group, an ALB
rule and its own pipelines, and Vite bakes `VITE_*` values at build
time so one image could not serve both environments. Its users are the
project team, not the public.

## Decision

The console is not deployed. Administrators run it locally and point
`VITE_API_BASE` at the environment they are administering.

## Consequences

- No administrative interface is reachable from the internet, and there
  is no third pipeline or task to pay for.
- Administrators need the repository and Node, so whoever demonstrates
  the system must have it running.
- The admin API stays public: `/api/profile/admin/*` is protected by
  the token's admin claim, which is the real security boundary.
- `CORS_ALLOWED_ORIGINS` must list `http://localhost:5173` wherever
  administrators work. CORS governs browsers only, so this does not
  weaken the API.

Revisit if administrators outside the team need access: a static bundle
on S3 behind CloudFront costs about US$1 per month, but first needs
runtime configuration instead of build-time `VITE_*` values.
