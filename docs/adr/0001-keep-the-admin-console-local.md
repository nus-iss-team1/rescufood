# 1. Keep the admin console local

Status: accepted, 2026-08-06

## Context

The platform has three applications: the Next.js web platform for
donors and rescue partners, the Go profile service, and the React admin
console used by platform administrators to approve organisations and
suspend members (FR1).

The first two are deployed to ECS behind the shared load balancer.
Deploying the console as well would mean:

- an image serving the built bundle, an ECS service, a target group and
  another ALB rule, plus its own CI and CD workflows;
- about US$11 per month for a third Fargate task;
- solving environment-specific builds, because Vite bakes `VITE_*`
  values into the bundle at build time. One image could not serve both
  dev and prod, which breaks the build-once-promote-everywhere
  property the other two components have.

The console's users are the project team, not the public.

## Decision

The admin console is not deployed. Administrators run it locally with
`npm run dev` and point `VITE_API_BASE` at whichever environment they
are administering. The service name `web-admin` stays reserved in the
cluster in case this is revisited.

## Consequences

Gained:

- No administrative interface is reachable from the internet.
- No third pipeline, target group or Fargate task to pay for and
  maintain.
- The console needs no environment-specific image.

Accepted:

- Administrators need the repository, Node and a local dev server, so
  whoever demonstrates the system must have it running beforehand.
- **The administrative API stays public.** Keeping the console local
  hides the interface, not the endpoints: `/api/profile/admin/*` is
  served by the internet-facing load balancer and protected by Cognito
  token verification plus an `is_admin` check. That check, not the
  console's location, is the security boundary.
- `CORS_ALLOWED_ORIGINS` must include `http://localhost:5173` in every
  environment administrators manage from their machines. This does not
  weaken the API: CORS governs what a browser lets JavaScript read and
  is ignored by any other client.

Revisit if administrators outside the team ever need access. The
cheapest hosted option is a static bundle on S3 behind CloudFront
(about US$1 per month), which would first require moving the console
from build-time `VITE_*` values to runtime configuration it fetches on
boot.
