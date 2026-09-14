-- In-app notifications are a capped feed: dismissed rows, and rows that
-- fall out of the cap when a newer one arrives, are soft-deleted rather
-- than removed, so the (event_id, recipient_user_id) dedupe index keeps
-- blocking duplicates on a reprocessed event.
ALTER TABLE "notifications" ADD COLUMN "deleted_at" timestamp with time zone;
