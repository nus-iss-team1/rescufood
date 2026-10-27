# 3. Adopt a microservices architecture

Status: accepted 2026-08-05, recorded 2026-10-27

## Decision

Three independently deployable services, split by what they own:
Profile owns identity and organisations (Go), Listings owns listings
and claims (NestJS), Notifications owns delivery (NestJS).

## Rationale

Seven members with different language strengths, six two-week sprints,
and most work happening outside working hours. A single application
would have forced one language on everyone and put the whole team in
the same build.

## Consequences

- Each member works in their strongest language.
- A service builds and deploys on its own, so one change does not
  rebuild the platform.
- Members edit different directories, so merge conflicts are rare.
- No distributed transactions. Services that must commit together
  share a database instead.
- Three pipelines and three secret sets to maintain, and several
  processes to run locally.

Paired with ADR 0004: independent deployment, shared source.
