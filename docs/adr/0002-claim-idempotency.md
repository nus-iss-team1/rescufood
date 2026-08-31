# 2. Claim idempotency

Status: accepted, 2026-08-30

## Context

`POST /api/requests` creates a first-come-first-served claim: it reserves
the whole listing for the caller's org in one transaction. Network or
client retries could otherwise submit the same claim twice. The original
first-come-first-served work shipped a minimal guard — a unique
`(rescue_org_id, idempotency_key)` index on `requests` and a replay lookup
— but it could not tell an identical retry from a key reused with different
data, had no retention story, and replayed the check only when the listing
was still `available` (a retry after the listing became `reserved` 400'd
instead of replaying).

## Decision

Idempotency state lives in its own table, `request_idempotency_keys`, one
row per claimed `(rescue_org_id, idempotency_key)` slot:

- `request_fingerprint` — sha256 of the claim-defining request fields
  (currently just `listingId`).
- `status` — `pending` while the claim transaction runs, `completed` once
  it commits (flipped in the same transaction as the claim and the audit
  row, so the three commit together).
- `claim_id` + `response_snapshot` — the outcome. Replay re-reads the
  claim by `claim_id`; the snapshot is kept for audit/debugging.
- `expires_at` — short while `pending` (`STALE_PENDING_MS`, 15 min, so an
  abandoned attempt is reclaimed), extended to `IDEMPOTENCY_RETENTION_DAYS`
  on completion.

`RequestsService.create` checks for an existing record **before** any
listing validation, then claims the slot with `INSERT … ON CONFLICT DO
NOTHING`:

| Situation | Result |
| --- | --- |
| New key | slot claimed, claim created, slot completed in the transaction |
| Identical retry (fingerprint matches, `completed`) | original claim returned, no new claim |
| Same key, different fingerprint | `409` conflict, existing claim untouched, `claim.idempotency_conflict` audited |
| Retry while the original is `pending` | `409` "still being processed" — caller retries and gets the original outcome |
| Lost the `ON CONFLICT` race | re-read the winner's record and resolve to replay or the `pending` `409` |
| Claim transaction fails | slot released so a genuine retry can proceed |

At-most-one-claim is guaranteed by the existing partial unique index
`requests_active_claim_per_listing_uq` plus the status-guarded
`reserveListingForClaim`; the idempotency table adds per-key
de-duplication on top.

`IdempotencyRetentionService` (`@Cron` hourly) deletes rows past
`expires_at`. `IDEMPOTENCY_RETENTION_DAYS` (default 7) is a CloudFormation
parameter (`ListingsIdempotencyRetentionDays`).

The old `requests.idempotency_key` column and its unique index are dropped
(`0012`) — the new table is the sole owner of the key. "Which key created
this claim" is answered by `request_idempotency_keys.claim_id` until the
record is pruned. `0012` drops a column the pre-existing code still
writes, so it is expand/contract: apply it **after** the new image is
live, not before (`0010`/`0011` are additive and go before the deploy).

## Consequences

- A retry mid-flight gets a `409` rather than blocking server-side; the
  caller must retry to receive the original outcome. This keeps a database
  connection from being held open for the duration of another request.
- A crash between claiming the slot and committing the claim leaves a
  `pending` row; retries `409` until it is reclaimed 15 minutes later.
- "Materially different request" is currently only `listingId` — the claim
  request body carries nothing else. If the body grows, extend
  `requestFingerprint`.
- The frontend already treats `409` on claim as "someone else got it";
  the two new `409` messages surface the same way. A dedicated
  conflict/retry UX is a separate frontend change.
- `idempotencyKey` leaves the claim response body (`RequestResponseDto`,
  the SDK `ListingRequest` type, its fixtures and mock). It stays a
  required field on the *request* (`CreateRequestDto` / `NewRequest`),
  so `web/platform`'s claim form is unaffected.
- Cross-service FK on `rescue_org_id` is hand-written
  (`0011_idempotency_cross_service_fk.sql`), same as `0001`.
