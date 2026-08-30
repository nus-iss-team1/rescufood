DROP INDEX "listings_expiry_scan_idx";--> statement-breakpoint
CREATE INDEX "listings_expiry_scan_idx" ON "listings" USING btree ("pickup_window_end") WHERE status in ('available', 'reserved');