# 5. Claim a listing first come first served

Status: accepted 2026-08-30, recorded 2026-10-27

## Decision

A claim takes the whole listing immediately and reserves it in one
transaction. The donor has no decision to make and no way to decline.

## Rationale

Claiming began as a request the donor accepted or declined. Surplus
food is time-sensitive, and a donor who did not respond for several
hours could lose the pickup window while the food sat reserved and
unavailable to anyone else.

## Consequences

- Claim states reduce to `active`, `cancelled`, `completed`,
  `no_show` and `expired`.
- A partial unique index allows at most one active claim per listing,
  so ending a claim frees the listing with no application code.
- `remaining_quantity` becomes `quantity`, since a claim takes the
  whole lot and never decrements it.
- Two partners can now race. A guarded UPDATE resolves it and the
  loser gets a 409.
- A retry is dangerous with no donor step to absorb it. See ADR 0002,
  which refines this.
