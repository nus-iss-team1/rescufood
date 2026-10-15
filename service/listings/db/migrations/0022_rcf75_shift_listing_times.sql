-- RCF-75 backfill: the web platform used to submit zoneless local times and
-- the server read them in its own UTC timezone, so times entered in Singapore
-- were stored 8 hours late. Shifts the donor-entered times back for listings
-- touched through the form, identified by their audit rows; the 0004 seed
-- rows have none and keep their (already correct) times. A listing saved
-- through the form more than once is still late by a further 8 hours per
-- save; re-saving it through the fixed form stores the entered times exactly.
UPDATE "listings" l
SET "use_by" = l."use_by" - interval '8 hours',
    "pickup_window_start" = l."pickup_window_start" - interval '8 hours',
    "pickup_window_end" = l."pickup_window_end" - interval '8 hours'
WHERE l."created_at" < timestamp with time zone '2026-10-15 03:00:00+00'
  AND (l."use_by" IS NOT NULL
    OR l."pickup_window_start" IS NOT NULL
    OR l."pickup_window_end" IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM "audit_log" a
    WHERE a."entity_type" = 'listing'
      AND a."entity_id" = l."id"
      AND a."action" IN (
        'listing.created',
        'listing.updated',
        'listing.published',
        'listing.unpublished',
        'listing.cancelled'
      )
  );
