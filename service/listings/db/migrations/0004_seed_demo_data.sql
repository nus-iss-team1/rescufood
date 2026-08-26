-- Comprehensive demo/dev seed: 35 listings spanning every category and the
-- full listing lifecycle (draft/available/reserved/collected/expired/
-- cancelled), plus 56 requests spanning the full request lifecycle
-- (pending/accepted/declined/superseded/cancelled/completed/no_show/
-- expired), so /browse and /requests look like a live marketplace rather
-- than a handful of hand-made rows.
--
-- donor_org_id/created_by are picked from whatever approved donor
-- organisation already exists, rather than inserting into organisations/
-- users here - those tables belong to service/profile (see
-- 0001_cross_service_fks.sql). The two rescue-partner organisations the
-- requests below claim against are referenced by id rather than looked up,
-- since this batch is scoped to this environment's existing rescue
-- partners; both are existence-checked below all the same, so a database
-- missing either one no-ops cleanly instead of failing the whole migrate run.
--
-- All quantity/status math mirrors exactly what
-- RequestsService.decide/verifyPickupCode would have produced (see
-- RequestsRepository.decrementListingQuantity/supersedeOtherPending/
-- markListingCollectedIfDone/incrementListingQuantity):
--   - an 'accepted' request that exactly exhausts remaining_quantity flips
--     the listing to 'reserved' and supersedes any other still-pending
--     requests on it
--   - a 'completed' request (accepted, then pickup-verified) flips a
--     'reserved' listing to 'collected' once nothing else on it is still
--     'accepted'
--   - a 'cancelled'/'no_show' request that was 'accepted' releases its
--     quantity back to the listing
--
-- This migration only creates the DB rows - the S3 objects for the
-- listing_images keys below still need to be uploaded separately (a SQL
-- migration has no way to reach S3).
--> statement-breakpoint
DO $$
DECLARE
  v_donor_org_id uuid;
  v_donor_user_id uuid;
  v_rescue_org_1 uuid := '6274b05e-1b58-4d88-aace-26dcb27f7e32';
  v_rescue_org_2 uuid := '3541023b-84cc-4a66-90d8-03221d810405';
BEGIN
  SELECT id INTO v_donor_org_id
  FROM organisations
  WHERE type = 'donor' AND status = 'approved'
  ORDER BY created_at
  LIMIT 1;

  IF v_donor_org_id IS NULL THEN
    RAISE NOTICE 'seed_demo_data: no approved donor organisation found, skipping';
    RETURN;
  END IF;

  SELECT id INTO v_donor_user_id
  FROM users
  WHERE org_id = v_donor_org_id
  ORDER BY created_at
  LIMIT 1;

  IF v_donor_user_id IS NULL THEN
    RAISE NOTICE 'seed_demo_data: donor organisation % has no members, skipping', v_donor_org_id;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM organisations WHERE id = v_rescue_org_1)
     OR NOT EXISTS (SELECT 1 FROM organisations WHERE id = v_rescue_org_2) THEN
    RAISE NOTICE 'seed_demo_data: expected rescue-partner organisations not found, skipping';
    RETURN;
  END IF;

  INSERT INTO listings (
    id, donor_org_id, created_by, category, description,
    remaining_quantity, unit, allergens, handling_instructions,
    use_by, pickup_location, pickup_window_start, pickup_window_end, status, cancelled_reason
  ) VALUES
    (
      '42402a1b-b440-4a8b-b4b4-a3155a0d744f', v_donor_org_id, v_donor_user_id, 'produce', 'Crate of ripe bananas and apples from this morning''s delivery',
      40, 'kg', '{}', 'Best kept refrigerated, ripening quickly',
      now() + interval '2 days', '88 Market Street, #01-12', now() + interval '1 day', now() + interval '1 day 4 hours', 'available', ''
    ),
    (
      '07aff46d-56fa-4cf8-aa74-1b4565b04d2c', v_donor_org_id, v_donor_user_id, 'dairy', 'Fresh whole milk cartons nearing best-by date',
      30, 'litres', '{Milk}', 'Keep chilled at all times',
      now() + interval '1 day 12 hours', '12 Orchard Turn', now() + interval '6 hours', now() + interval '10 hours', 'available', ''
    ),
    (
      '2dcbb5a5-aa2c-43bb-88d4-92b0a1a4357e', v_donor_org_id, v_donor_user_id, 'meat_seafood', 'Frozen chicken breast portions, vacuum sealed',
      15, 'kg', '{}', 'Keep frozen; thaws quickly once collected',
      now() + interval '5 days', '5 Jurong Gateway Road', now() + interval '1 day', now() + interval '1 day 3 hours', 'available', ''
    ),
    (
      'c4f8fd27-383e-4a44-9ec7-734460fd3df5', v_donor_org_id, v_donor_user_id, 'beverages', 'Assorted bottled fruit juices, single-serve',
      60, 'bottles', '{}', 'Store at room temperature, out of direct sun',
      now() + interval '10 days', '3 Temasek Boulevard', now() + interval '2 days', now() + interval '2 days 5 hours', 'available', ''
    ),
    (
      'e2b75512-40d0-4a3a-bbe1-938c99c843ed', v_donor_org_id, v_donor_user_id, 'packaged_dry_goods', 'Boxes of pasta and rice, unopened',
      25, 'kg', '{Gluten}', 'Dry storage, no special handling needed',
      now() + interval '30 days', '20 Bendemeer Road', now() + interval '3 days', now() + interval '3 days 6 hours', 'available', ''
    ),
    (
      'ef3f3f05-83e8-414f-b7bb-85857260dc9a', v_donor_org_id, v_donor_user_id, 'other', 'Mixed pantry surplus from event catering',
      10, 'boxes', '{}', 'Contents vary by box, labelled individually',
      now() + interval '4 days', '9 Raffles Boulevard', now() + interval '1 day', now() + interval '1 day 2 hours', 'available', ''
    ),
    (
      'fd47c8b4-641f-4569-8801-45a59f602176', v_donor_org_id, v_donor_user_id, 'produce', 'Crate of mixed seasonal vegetables',
      10, 'kg', '{}', 'Best kept refrigerated, ripening quickly',
      now() + interval '2 days', '88 Market Street, #01-12', now() + interval '1 days', now() + interval '1 days' + interval '3 hours', 'available', ''
    ),
    (
      '1081c41e-84a2-4d27-a70a-9bbf72dea7c3', v_donor_org_id, v_donor_user_id, 'bakery', 'Assorted pastries from this morning''s bake',
      17, 'loaves', '{Gluten}', 'Best eaten within a day of collection',
      now() + interval '3 days', '12 Orchard Turn', now() + interval '2 days', now() + interval '2 days' + interval '4 hours', 'available', ''
    ),
    (
      '1ef13e72-e8a1-4fe6-9f63-ac0f9b5bf8a1', v_donor_org_id, v_donor_user_id, 'dairy', 'Block cheese offcuts',
      24, 'litres', '{Milk}', 'Keep chilled at all times',
      now() + interval '4 days', '5 Jurong Gateway Road', now() + interval '3 days', now() + interval '3 days' + interval '5 hours', 'available', ''
    ),
    (
      '067a109b-9225-4881-9394-e4b288921700', v_donor_org_id, v_donor_user_id, 'meat_seafood', 'Frozen prawns, unopened packs',
      31, 'kg', '{}', 'Keep frozen; thaws quickly once collected',
      now() + interval '5 days', '3 Temasek Boulevard', now() + interval '4 days', now() + interval '4 days' + interval '6 hours', 'available', ''
    ),
    (
      'da5b3ba0-be74-495f-b46e-dd2f15f90ab6', v_donor_org_id, v_donor_user_id, 'prepared_food', 'Catering surplus from a corporate event',
      38, 'portions', '{}', 'Consume within a few hours of collection',
      now() + interval '6 days', '20 Bendemeer Road', now() + interval '5 days', now() + interval '5 days' + interval '3 hours', 'available', ''
    ),
    (
      '31f9d74b-3ea8-465d-8d75-ffe843f58c5c', v_donor_org_id, v_donor_user_id, 'packaged_dry_goods', 'Canned goods nearing best-by',
      45, 'kg', '{Gluten}', 'Dry storage, no special handling needed',
      now() + interval '7 days', '9 Raffles Boulevard', now() + interval '1 days', now() + interval '1 days' + interval '4 hours', 'available', ''
    ),
    (
      '1c12ecfe-9f93-4764-9c18-8454898a0d96', v_donor_org_id, v_donor_user_id, 'beverages', 'Bottled water cases',
      12, 'bottles', '{}', 'Store at room temperature, out of direct sun',
      now() + interval '8 days', '2 Serangoon Central', now() + interval '2 days', now() + interval '2 days' + interval '5 hours', 'available', ''
    ),
    (
      'a5276f54-a289-4612-987c-21db5949a50c', v_donor_org_id, v_donor_user_id, 'other', 'Sundry food surplus',
      19, 'boxes', '{}', 'Contents vary by box, labelled individually',
      now() + interval '9 days', '6 Tampines Central 1', now() + interval '3 days', now() + interval '3 days' + interval '6 hours', 'available', ''
    ),
    (
      '51af387c-232d-4dd2-a338-abf150cef1eb', v_donor_org_id, v_donor_user_id, 'produce', 'Crate of mixed seasonal vegetables',
      26, 'kg', '{}', 'Best kept refrigerated, ripening quickly',
      now() + interval '10 days', '15 Woodlands Square', now() + interval '4 days', now() + interval '4 days' + interval '3 hours', 'available', ''
    ),
    (
      '08c61a13-5166-43c5-ae3f-1868eb9bb75f', v_donor_org_id, v_donor_user_id, 'bakery', 'Assorted pastries from this morning''s bake',
      33, 'loaves', '{Gluten}', 'Best eaten within a day of collection',
      now() + interval '11 days', '7 Clementi Avenue 3', now() + interval '5 days', now() + interval '5 days' + interval '4 hours', 'available', ''
    ),
    (
      '1ab913f4-d0f2-4eb8-be06-22e9aa8eef85', v_donor_org_id, v_donor_user_id, 'dairy', 'Block cheese offcuts',
      40, 'litres', '{Milk}', 'Keep chilled at all times',
      now() + interval '2 days', '18 Bukit Timah Road', now() + interval '1 days', now() + interval '1 days' + interval '5 hours', 'available', ''
    ),
    (
      '1168f1d4-e883-404b-a8f4-393a558f9209', v_donor_org_id, v_donor_user_id, 'meat_seafood', 'Frozen prawns, unopened packs',
      47, 'kg', '{}', 'Keep frozen; thaws quickly once collected',
      now() + interval '3 days', '4 Ang Mo Kio Avenue 5', now() + interval '2 days', now() + interval '2 days' + interval '6 hours', 'available', ''
    ),
    (
      '20116c42-4729-47a0-8afc-3a1dd89891cc', v_donor_org_id, v_donor_user_id, 'prepared_food', 'Catering surplus from a corporate event',
      14, 'portions', '{}', 'Consume within a few hours of collection',
      now() + interval '4 days', '11 Toa Payoh Central', now() + interval '3 days', now() + interval '3 days' + interval '3 hours', 'available', ''
    ),
    (
      '88858e54-760a-4455-b7e3-735a51bc861a', v_donor_org_id, v_donor_user_id, 'packaged_dry_goods', 'Canned goods nearing best-by',
      13, 'kg', '{Gluten}', 'Dry storage, no special handling needed',
      now() + interval '5 days', '22 Yishun Avenue 2', now() + interval '4 days', now() + interval '4 days' + interval '4 hours', 'available', ''
    ),
    (
      '86f389cd-1966-4068-b173-ee36f57f7c5d', v_donor_org_id, v_donor_user_id, 'beverages', 'Bottled water cases',
      28, 'bottles', '{}', 'Store at room temperature, out of direct sun',
      now() + interval '6 days', '1 Punggol Central', now() + interval '5 days', now() + interval '5 days' + interval '5 hours', 'available', ''
    ),
    (
      '4cc8f4ff-db2c-442f-add9-064e7c14e2ce', v_donor_org_id, v_donor_user_id, 'other', 'Sundry food surplus',
      35, 'boxes', '{}', 'Contents vary by box, labelled individually',
      now() + interval '7 days', '88 Market Street, #01-12', now() + interval '1 days', now() + interval '1 days' + interval '6 hours', 'available', ''
    ),
    (
      '056a2ea6-b8a4-4540-8632-2a84d27aaeb1', v_donor_org_id, v_donor_user_id, 'produce', 'Crate of mixed seasonal vegetables',
      42, 'kg', '{}', 'Best kept refrigerated, ripening quickly',
      now() + interval '8 days', '12 Orchard Turn', now() + interval '2 days', now() + interval '2 days' + interval '3 hours', 'draft', ''
    ),
    (
      '167979f6-6ccb-4e90-860d-08077adffbad', v_donor_org_id, v_donor_user_id, 'bakery', 'Assorted pastries from this morning''s bake',
      49, 'loaves', '{Gluten}', 'Best eaten within a day of collection',
      now() + interval '9 days', '5 Jurong Gateway Road', now() + interval '3 days', now() + interval '3 days' + interval '4 hours', 'draft', ''
    ),
    (
      '031e45e1-6770-41fc-8383-221094465629', v_donor_org_id, v_donor_user_id, 'dairy', 'Block cheese offcuts',
      16, 'litres', '{Milk}', 'Keep chilled at all times',
      now() + interval '10 days', '3 Temasek Boulevard', now() + interval '4 days', now() + interval '4 days' + interval '5 hours', 'draft', ''
    ),
    (
      '90bfd6b4-0877-4719-a712-cabc78bc91b0', v_donor_org_id, v_donor_user_id, 'meat_seafood', 'Frozen prawns, unopened packs',
      0, 'kg', '{}', 'Keep frozen; thaws quickly once collected',
      now() + interval '6 days', '20 Bendemeer Road', now() - interval '2 hours', now() + interval '3 hours', 'reserved', ''
    ),
    (
      '64874b33-f8b6-4211-a953-0f70e1c4d750', v_donor_org_id, v_donor_user_id, 'prepared_food', 'Catering surplus from a corporate event',
      0, 'portions', '{}', 'Consume within a few hours of collection',
      now() + interval '3 days', '9 Raffles Boulevard', now() - interval '1 hours', now() + interval '4 hours', 'reserved', ''
    ),
    (
      'd8bfa5db-b2d9-4c3d-9f03-43e978ad97e0', v_donor_org_id, v_donor_user_id, 'packaged_dry_goods', 'Canned goods nearing best-by',
      0, 'kg', '{Gluten}', 'Dry storage, no special handling needed',
      now() + interval '4 days', '2 Serangoon Central', now() - interval '2 hours', now() + interval '2 hours', 'reserved', ''
    ),
    (
      '7282bbde-ee58-4e84-acb4-318adba7eb41', v_donor_org_id, v_donor_user_id, 'beverages', 'Bottled water cases',
      0, 'bottles', '{}', 'Store at room temperature, out of direct sun',
      now() - interval '2 days', '6 Tampines Central 1', now() - interval '2 days', now() - interval '2 days' + interval '4 hours', 'collected', ''
    ),
    (
      '9ab9961a-3550-49c2-8415-935be11b2156', v_donor_org_id, v_donor_user_id, 'other', 'Sundry food surplus',
      0, 'boxes', '{}', 'Contents vary by box, labelled individually',
      now() - interval '3 days', '15 Woodlands Square', now() - interval '3 days', now() - interval '3 days' + interval '4 hours', 'collected', ''
    ),
    (
      '312818c2-0b50-4e4e-bbe6-f34492fced7a', v_donor_org_id, v_donor_user_id, 'produce', 'Crate of mixed seasonal vegetables',
      0, 'kg', '{}', 'Best kept refrigerated, ripening quickly',
      now() - interval '1 days', '7 Clementi Avenue 3', now() - interval '2 days', now() - interval '2 days' + interval '4 hours', 'collected', ''
    ),
    (
      '57f2a210-e182-489b-b4f9-8ee1220a672f', v_donor_org_id, v_donor_user_id, 'bakery', 'Assorted pastries from this morning''s bake',
      0, 'loaves', '{Gluten}', 'Best eaten within a day of collection',
      now() - interval '2 days', '18 Bukit Timah Road', now() - interval '3 days', now() - interval '3 days' + interval '4 hours', 'collected', ''
    ),
    (
      'be94380a-f550-4bc2-b62d-f0f5855bd516', v_donor_org_id, v_donor_user_id, 'dairy', 'Block cheese offcuts',
      32, 'litres', '{Milk}', 'Keep chilled at all times',
      now() - interval '4 days', '4 Ang Mo Kio Avenue 5', now() - interval '5 days', now() - interval '5 days' + interval '3 hours', 'expired', ''
    ),
    (
      '074b31cc-f2f5-465d-aa97-fb1ec048cda5', v_donor_org_id, v_donor_user_id, 'meat_seafood', 'Frozen prawns, unopened packs',
      39, 'kg', '{}', 'Keep frozen; thaws quickly once collected',
      now() - interval '5 days', '11 Toa Payoh Central', now() - interval '6 days', now() - interval '6 days' + interval '3 hours', 'expired', ''
    ),
    (
      'e0c9d9d5-54d2-42a1-bd12-566076725a9c', v_donor_org_id, v_donor_user_id, 'prepared_food', 'Catering surplus from a corporate event',
      46, 'portions', '{}', 'Consume within a few hours of collection',
      now() + interval '10 days', '22 Yishun Avenue 2', now() + interval '4 days', now() + interval '4 days' + interval '3 hours', 'cancelled', 'Donor closed early, surplus redirected elsewhere'
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO listing_images (listing_id, s3_key, position) VALUES
    ('42402a1b-b440-4a8b-b4b4-a3155a0d744f', 'listings/42402a1b-b440-4a8b-b4b4-a3155a0d744f/872da6ec-9a36-42ec-9c10-28aff81093d1.jpg', 0),
    ('07aff46d-56fa-4cf8-aa74-1b4565b04d2c', 'listings/07aff46d-56fa-4cf8-aa74-1b4565b04d2c/f549e8b4-6b00-4190-adbe-750292099044.jpg', 0),
    ('2dcbb5a5-aa2c-43bb-88d4-92b0a1a4357e', 'listings/2dcbb5a5-aa2c-43bb-88d4-92b0a1a4357e/54370d3f-334a-489e-8954-0d84c8c29b2b.jpg', 0),
    ('c4f8fd27-383e-4a44-9ec7-734460fd3df5', 'listings/c4f8fd27-383e-4a44-9ec7-734460fd3df5/45c059aa-d26b-43cd-8efb-e1281a6d806e.jpg', 0),
    ('e2b75512-40d0-4a3a-bbe1-938c99c843ed', 'listings/e2b75512-40d0-4a3a-bbe1-938c99c843ed/6f853c11-0677-4a6f-91ea-d8f0245acdfe.jpg', 0),
    ('ef3f3f05-83e8-414f-b7bb-85857260dc9a', 'listings/ef3f3f05-83e8-414f-b7bb-85857260dc9a/d14312af-6a2f-434c-bac7-80eec67722e1.jpg', 0),
    ('fd47c8b4-641f-4569-8801-45a59f602176', 'listings/fd47c8b4-641f-4569-8801-45a59f602176/c79d533f-c34a-41a9-b540-6431cbc43664.jpg', 0),
    ('1081c41e-84a2-4d27-a70a-9bbf72dea7c3', 'listings/1081c41e-84a2-4d27-a70a-9bbf72dea7c3/008a7c59-36aa-4f34-958b-1af7aafcacd7.jpg', 0),
    ('1ef13e72-e8a1-4fe6-9f63-ac0f9b5bf8a1', 'listings/1ef13e72-e8a1-4fe6-9f63-ac0f9b5bf8a1/4dfab9db-c3c8-459a-b8ca-0d4cd7bd5d0b.jpg', 0),
    ('067a109b-9225-4881-9394-e4b288921700', 'listings/067a109b-9225-4881-9394-e4b288921700/5dca194d-f455-4c8e-9958-0495b2d280dc.jpg', 0),
    ('da5b3ba0-be74-495f-b46e-dd2f15f90ab6', 'listings/da5b3ba0-be74-495f-b46e-dd2f15f90ab6/ee433665-54b7-4c31-9be8-22929cab740f.jpg', 0),
    ('31f9d74b-3ea8-465d-8d75-ffe843f58c5c', 'listings/31f9d74b-3ea8-465d-8d75-ffe843f58c5c/beca74cc-5e1b-4282-8145-a5b2628a0228.jpg', 0),
    ('1c12ecfe-9f93-4764-9c18-8454898a0d96', 'listings/1c12ecfe-9f93-4764-9c18-8454898a0d96/5d041a9f-3bc1-44ae-8e59-f5fe1494c5fd.jpg', 0),
    ('a5276f54-a289-4612-987c-21db5949a50c', 'listings/a5276f54-a289-4612-987c-21db5949a50c/09e836ad-e5b4-4846-b58a-75caa327c3b9.jpg', 0),
    ('51af387c-232d-4dd2-a338-abf150cef1eb', 'listings/51af387c-232d-4dd2-a338-abf150cef1eb/4755127e-4492-4c69-843a-95d9566857e3.jpg', 0),
    ('08c61a13-5166-43c5-ae3f-1868eb9bb75f', 'listings/08c61a13-5166-43c5-ae3f-1868eb9bb75f/3af0b6b8-d907-4825-b210-37cb7d1214aa.jpg', 0),
    ('1ab913f4-d0f2-4eb8-be06-22e9aa8eef85', 'listings/1ab913f4-d0f2-4eb8-be06-22e9aa8eef85/3d4de110-54cb-461d-9946-b6063bf203d8.jpg', 0),
    ('1168f1d4-e883-404b-a8f4-393a558f9209', 'listings/1168f1d4-e883-404b-a8f4-393a558f9209/8ea89124-0e0d-4c80-8b55-75a46a458f90.jpg', 0),
    ('20116c42-4729-47a0-8afc-3a1dd89891cc', 'listings/20116c42-4729-47a0-8afc-3a1dd89891cc/0f212e68-2343-4312-afe1-efbc36b1cf1f.jpg', 0),
    ('88858e54-760a-4455-b7e3-735a51bc861a', 'listings/88858e54-760a-4455-b7e3-735a51bc861a/a4b57560-e7c9-4f52-b46a-2a99950ece7a.jpg', 0),
    ('86f389cd-1966-4068-b173-ee36f57f7c5d', 'listings/86f389cd-1966-4068-b173-ee36f57f7c5d/b23b0e44-9d88-4678-aaa4-bd9dabf6a153.jpg', 0),
    ('4cc8f4ff-db2c-442f-add9-064e7c14e2ce', 'listings/4cc8f4ff-db2c-442f-add9-064e7c14e2ce/c339b8e1-9761-474b-a653-032c12afa580.jpg', 0),
    ('90bfd6b4-0877-4719-a712-cabc78bc91b0', 'listings/90bfd6b4-0877-4719-a712-cabc78bc91b0/483d5ecc-c680-4750-9cdf-b360c68643da.jpg', 0),
    ('64874b33-f8b6-4211-a953-0f70e1c4d750', 'listings/64874b33-f8b6-4211-a953-0f70e1c4d750/d079f1e9-f99b-42c6-8149-e0de6edc6b46.jpg', 0),
    ('d8bfa5db-b2d9-4c3d-9f03-43e978ad97e0', 'listings/d8bfa5db-b2d9-4c3d-9f03-43e978ad97e0/1e98df23-8167-410b-a856-e7385074a53f.jpg', 0),
    ('7282bbde-ee58-4e84-acb4-318adba7eb41', 'listings/7282bbde-ee58-4e84-acb4-318adba7eb41/cc493299-aa8a-4163-88ad-0b797cf3e36b.jpg', 0),
    ('9ab9961a-3550-49c2-8415-935be11b2156', 'listings/9ab9961a-3550-49c2-8415-935be11b2156/ddb1c7e6-d31b-4b35-acca-d3ba10d4e5a7.jpg', 0),
    ('312818c2-0b50-4e4e-bbe6-f34492fced7a', 'listings/312818c2-0b50-4e4e-bbe6-f34492fced7a/a9988010-2d7a-463c-8155-9d3f819b3c24.jpg', 0),
    ('57f2a210-e182-489b-b4f9-8ee1220a672f', 'listings/57f2a210-e182-489b-b4f9-8ee1220a672f/c0bff74d-30ca-4b06-84c4-6246e3a2491f.jpg', 0),
    ('be94380a-f550-4bc2-b62d-f0f5855bd516', 'listings/be94380a-f550-4bc2-b62d-f0f5855bd516/4a57bdc0-4f09-40f7-ac73-8c64d4eb87e2.jpg', 0),
    ('074b31cc-f2f5-465d-aa97-fb1ec048cda5', 'listings/074b31cc-f2f5-465d-aa97-fb1ec048cda5/91d74486-ef9d-405d-8b50-4109ed7a63ae.jpg', 0),
    ('e0c9d9d5-54d2-42a1-bd12-566076725a9c', 'listings/e0c9d9d5-54d2-42a1-bd12-566076725a9c/62770ff1-c94d-4686-a6fc-61171e64f86b.jpg', 0)
  ON CONFLICT (listing_id, position) DO NOTHING;

  INSERT INTO requests (
    id, listing_id, rescue_org_id, claimed_by, idempotency_key, status, requested_quantity, requested_at, responded_by, responded_at, decline_reason, cancelled_at, cancellation_reason, code_expires_at, code_generated_by, verified_by, collected_quantity, collected_at, no_show_reason
  ) VALUES
    ('eb5e6fc7-58a5-4ee8-8d48-16cf145e84e5', '1ef13e72-e8a1-4fe6-9f63-ac0f9b5bf8a1', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-eb5e6fc7-58a5-4ee8-8d48-16cf145e84e5', 'pending', 2, now() - interval '4 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('ece30596-538b-4ec8-bb3c-cdc74c952411', '1ef13e72-e8a1-4fe6-9f63-ac0f9b5bf8a1', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-ece30596-538b-4ec8-bb3c-cdc74c952411', 'pending', 6, now() - interval '7 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('19d3d0f8-db78-489e-8429-12524e722aa1', '1ef13e72-e8a1-4fe6-9f63-ac0f9b5bf8a1', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-19d3d0f8-db78-489e-8429-12524e722aa1', 'pending', 10, now() - interval '10 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('ad5a2c6b-680e-45dd-bf59-d7cffa50ae52', '1ef13e72-e8a1-4fe6-9f63-ac0f9b5bf8a1', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-ad5a2c6b-680e-45dd-bf59-d7cffa50ae52', 'pending', 13, now() - interval '13 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('458cfd19-ed8a-4846-9816-727659e83222', '1ef13e72-e8a1-4fe6-9f63-ac0f9b5bf8a1', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-458cfd19-ed8a-4846-9816-727659e83222', 'pending', 17, now() - interval '16 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('cc901779-7307-401b-87c3-0a243c469d85', '067a109b-9225-4881-9394-e4b288921700', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-cc901779-7307-401b-87c3-0a243c469d85', 'pending', 3, now() - interval '4 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('4fbce4bf-06ca-463d-bae5-00f498bf56af', '067a109b-9225-4881-9394-e4b288921700', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-4fbce4bf-06ca-463d-bae5-00f498bf56af', 'pending', 8, now() - interval '7 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('4fbbdd73-39c9-4dde-b1e9-aefcf7d290c2', '067a109b-9225-4881-9394-e4b288921700', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-4fbbdd73-39c9-4dde-b1e9-aefcf7d290c2', 'pending', 12, now() - interval '10 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('920ad4b8-cf2b-4676-b546-2cf1903e4773', 'da5b3ba0-be74-495f-b46e-dd2f15f90ab6', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-920ad4b8-cf2b-4676-b546-2cf1903e4773', 'pending', 4, now() - interval '4 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('db3cc1d3-028a-4fbe-936d-ffe7de96a03a', 'da5b3ba0-be74-495f-b46e-dd2f15f90ab6', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-db3cc1d3-028a-4fbe-936d-ffe7de96a03a', 'pending', 10, now() - interval '7 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('b7390f06-69cf-4a18-9b92-46d3c48afdfd', 'da5b3ba0-be74-495f-b46e-dd2f15f90ab6', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-b7390f06-69cf-4a18-9b92-46d3c48afdfd', 'pending', 15, now() - interval '10 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('37cebe44-49f0-41a9-9a44-1137025167a5', 'da5b3ba0-be74-495f-b46e-dd2f15f90ab6', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-37cebe44-49f0-41a9-9a44-1137025167a5', 'pending', 21, now() - interval '13 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('082f568e-a6ae-4151-88b4-0c87125255d0', '31f9d74b-3ea8-465d-8d75-ffe843f58c5c', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-082f568e-a6ae-4151-88b4-0c87125255d0', 'pending', 5, now() - interval '4 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('b964f257-a047-4eb3-80d8-196fcc2e5857', '31f9d74b-3ea8-465d-8d75-ffe843f58c5c', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-b964f257-a047-4eb3-80d8-196fcc2e5857', 'pending', 11, now() - interval '7 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('ce7d4b74-1910-4699-b85a-9ef65c6b3a29', '31f9d74b-3ea8-465d-8d75-ffe843f58c5c', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-ce7d4b74-1910-4699-b85a-9ef65c6b3a29', 'pending', 18, now() - interval '10 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('38b273d0-3457-427a-b21c-e01224a45dd6', '31f9d74b-3ea8-465d-8d75-ffe843f58c5c', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-38b273d0-3457-427a-b21c-e01224a45dd6', 'pending', 25, now() - interval '13 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('e0f8e2ed-6210-4035-95e8-39ab5455f46b', '31f9d74b-3ea8-465d-8d75-ffe843f58c5c', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-e0f8e2ed-6210-4035-95e8-39ab5455f46b', 'pending', 31, now() - interval '16 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('c03096ac-ba5c-4d6c-aa5d-e5695afe41db', '1c12ecfe-9f93-4764-9c18-8454898a0d96', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-c03096ac-ba5c-4d6c-aa5d-e5695afe41db', 'pending', 1, now() - interval '4 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('aa8712af-d3c1-400b-8823-3b9594528579', '1c12ecfe-9f93-4764-9c18-8454898a0d96', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-aa8712af-d3c1-400b-8823-3b9594528579', 'pending', 3, now() - interval '7 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('bcbd4d72-c054-4ae8-ac1b-f8f57208fe39', '1c12ecfe-9f93-4764-9c18-8454898a0d96', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-bcbd4d72-c054-4ae8-ac1b-f8f57208fe39', 'pending', 5, now() - interval '10 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('7ba8b53d-3ac3-41fb-9f89-4fb96e253b63', 'a5276f54-a289-4612-987c-21db5949a50c', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-7ba8b53d-3ac3-41fb-9f89-4fb96e253b63', 'pending', 2, now() - interval '4 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('ce9e5a88-7c70-4469-a204-aaff6a72ee3d', 'a5276f54-a289-4612-987c-21db5949a50c', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-ce9e5a88-7c70-4469-a204-aaff6a72ee3d', 'pending', 5, now() - interval '7 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('1cc5ea3a-f142-45e5-999b-e74dce44cb7d', 'a5276f54-a289-4612-987c-21db5949a50c', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-1cc5ea3a-f142-45e5-999b-e74dce44cb7d', 'pending', 8, now() - interval '10 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('2be86c68-75b5-45ba-be85-e7d63df7b784', 'a5276f54-a289-4612-987c-21db5949a50c', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-2be86c68-75b5-45ba-be85-e7d63df7b784', 'pending', 10, now() - interval '13 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('be4f3b2b-ca25-497c-9c68-cbc98f5144df', '51af387c-232d-4dd2-a338-abf150cef1eb', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-be4f3b2b-ca25-497c-9c68-cbc98f5144df', 'pending', 3, now() - interval '4 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('711d565a-b3e1-44e0-9942-daa1e7a23363', '51af387c-232d-4dd2-a338-abf150cef1eb', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-711d565a-b3e1-44e0-9942-daa1e7a23363', 'pending', 7, now() - interval '7 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('eaf060a2-ee91-4d47-8676-db42afaab9f7', '51af387c-232d-4dd2-a338-abf150cef1eb', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-eaf060a2-ee91-4d47-8676-db42afaab9f7', 'pending', 10, now() - interval '10 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('2bf1af9b-b84e-4a86-89b6-25bd219d531f', '51af387c-232d-4dd2-a338-abf150cef1eb', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-2bf1af9b-b84e-4a86-89b6-25bd219d531f', 'pending', 14, now() - interval '13 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('abb5df9b-b6ab-45e6-a5be-7952d7099d65', '51af387c-232d-4dd2-a338-abf150cef1eb', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-abb5df9b-b6ab-45e6-a5be-7952d7099d65', 'pending', 18, now() - interval '16 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('882d454f-32af-48c0-a437-7ae613257aa6', '08c61a13-5166-43c5-ae3f-1868eb9bb75f', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-882d454f-32af-48c0-a437-7ae613257aa6', 'pending', 3, now() - interval '4 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('ab650347-cb26-455b-8f17-6a1203e7b479', '08c61a13-5166-43c5-ae3f-1868eb9bb75f', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-ab650347-cb26-455b-8f17-6a1203e7b479', 'pending', 8, now() - interval '7 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('6c530ecb-3c65-4ef7-aa60-c8b490867bac', '08c61a13-5166-43c5-ae3f-1868eb9bb75f', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-6c530ecb-3c65-4ef7-aa60-c8b490867bac', 'pending', 13, now() - interval '10 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('5253a243-2bab-4ed2-90e1-ea25bf713f06', '1ab913f4-d0f2-4eb8-be06-22e9aa8eef85', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-5253a243-2bab-4ed2-90e1-ea25bf713f06', 'declined', 8, now() - interval '20 hours', v_donor_user_id, now() - interval '19 hours', 'Already promised to another partner', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('9eecab50-0977-4072-b814-b3e84d4d9c6b', '1168f1d4-e883-404b-a8f4-393a558f9209', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-9eecab50-0977-4072-b814-b3e84d4d9c6b', 'declined', 9, now() - interval '20 hours', v_donor_user_id, now() - interval '19 hours', 'Already promised to another partner', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('dfda6e47-a0e4-4ec7-938d-5920d121f461', '1168f1d4-e883-404b-a8f4-393a558f9209', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-dfda6e47-a0e4-4ec7-938d-5920d121f461', 'declined', 9, now() - interval '25 hours', v_donor_user_id, now() - interval '24 hours', 'Already promised to another partner', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('88039938-4f1c-4d0d-a50f-d153db84f08d', '20116c42-4729-47a0-8afc-3a1dd89891cc', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-88039938-4f1c-4d0d-a50f-d153db84f08d', 'declined', 3, now() - interval '20 hours', v_donor_user_id, now() - interval '19 hours', 'Already promised to another partner', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('e8f03492-6152-4e2d-b66d-76829fa716ca', '88858e54-760a-4455-b7e3-735a51bc861a', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-e8f03492-6152-4e2d-b66d-76829fa716ca', 'accepted', 8, now() - interval '10 hours', v_donor_user_id, now() - interval '9 hours', '', NULL, '', now() + interval '30 minutes', '68a09fc5-ea2e-4778-af4d-f89635118b85', NULL, NULL, NULL, ''),
    ('e68a2f38-4511-43c5-9ed3-4e14a62b53da', '86f389cd-1966-4068-b173-ee36f57f7c5d', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-e68a2f38-4511-43c5-9ed3-4e14a62b53da', 'cancelled', 11, now() - interval '10 hours', NULL, NULL, '', now() - interval '9 hours', 'Found the item elsewhere in time', NULL, NULL, NULL, NULL, NULL, ''),
    ('dd428907-cf87-44e0-b4b1-5152fdba1d97', '4cc8f4ff-db2c-442f-add9-064e7c14e2ce', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-dd428907-cf87-44e0-b4b1-5152fdba1d97', 'no_show', 14, now() - interval '10 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, 'Nobody arrived within the pickup window'),
    ('1374b1ca-6567-4d27-97d4-a8fa2b6bb3bc', '90bfd6b4-0877-4719-a712-cabc78bc91b0', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-1374b1ca-6567-4d27-97d4-a8fa2b6bb3bc', 'accepted', 23, now() - interval '8 hours', v_donor_user_id, now() - interval '7 hours', '', NULL, '', now() + interval '30 minutes', '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', NULL, NULL, NULL, ''),
    ('bfec6077-8a08-4adc-be81-40d9feadada9', '90bfd6b4-0877-4719-a712-cabc78bc91b0', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-bfec6077-8a08-4adc-be81-40d9feadada9', 'superseded', 5, now() - interval '9 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('bc93c910-5b94-4efd-9fd7-096b64b04b93', '64874b33-f8b6-4211-a953-0f70e1c4d750', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-bc93c910-5b94-4efd-9fd7-096b64b04b93', 'accepted', 30, now() - interval '8 hours', v_donor_user_id, now() - interval '7 hours', '', NULL, '', now() + interval '30 minutes', '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', NULL, NULL, NULL, ''),
    ('956d0678-1e87-4330-bed2-74a7e3c084f2', 'd8bfa5db-b2d9-4c3d-9f03-43e978ad97e0', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-956d0678-1e87-4330-bed2-74a7e3c084f2', 'accepted', 37, now() - interval '8 hours', v_donor_user_id, now() - interval '7 hours', '', NULL, '', now() + interval '30 minutes', '68a09fc5-ea2e-4778-af4d-f89635118b85', NULL, NULL, NULL, ''),
    ('60d98a61-556f-4ee2-b45b-1c4679e95ec9', 'd8bfa5db-b2d9-4c3d-9f03-43e978ad97e0', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-60d98a61-556f-4ee2-b45b-1c4679e95ec9', 'superseded', 7, now() - interval '9 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('aea64fba-46af-49ef-87a3-ab93e2567cb4', 'd8bfa5db-b2d9-4c3d-9f03-43e978ad97e0', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-aea64fba-46af-49ef-87a3-ab93e2567cb4', 'superseded', 7, now() - interval '10 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('d2b8fe87-86b0-450f-96f4-ae2601d8f75c', '7282bbde-ee58-4e84-acb4-318adba7eb41', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-d2b8fe87-86b0-450f-96f4-ae2601d8f75c', 'completed', 44, now() - interval '30 hours', v_donor_user_id, now() - interval '29 hours', '', NULL, '', now() - interval '6 hours', '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', v_donor_user_id, 44, now() - interval '6 hours', ''),
    ('11ca1a3b-8716-44af-82f8-fa1622a68e7f', '7282bbde-ee58-4e84-acb4-318adba7eb41', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-11ca1a3b-8716-44af-82f8-fa1622a68e7f', 'superseded', 9, now() - interval '31 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('d17b679f-809c-4e28-ab11-446c720e6ecc', '9ab9961a-3550-49c2-8415-935be11b2156', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-d17b679f-809c-4e28-ab11-446c720e6ecc', 'completed', 11, now() - interval '30 hours', v_donor_user_id, now() - interval '29 hours', '', NULL, '', now() - interval '6 hours', '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', v_donor_user_id, 11, now() - interval '6 hours', ''),
    ('d268b6dd-2568-40c5-8975-fa310f615e52', '312818c2-0b50-4e4e-bbe6-f34492fced7a', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-d268b6dd-2568-40c5-8975-fa310f615e52', 'completed', 18, now() - interval '30 hours', v_donor_user_id, now() - interval '29 hours', '', NULL, '', now() - interval '6 hours', '68a09fc5-ea2e-4778-af4d-f89635118b85', v_donor_user_id, 18, now() - interval '6 hours', ''),
    ('50f37632-b9f2-46b6-bf65-26e1a86e69e5', '312818c2-0b50-4e4e-bbe6-f34492fced7a', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-50f37632-b9f2-46b6-bf65-26e1a86e69e5', 'superseded', 4, now() - interval '31 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('d2d4d407-9a65-4763-a63a-114ad9d5a9b8', '57f2a210-e182-489b-b4f9-8ee1220a672f', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-d2d4d407-9a65-4763-a63a-114ad9d5a9b8', 'completed', 25, now() - interval '30 hours', v_donor_user_id, now() - interval '29 hours', '', NULL, '', now() - interval '6 hours', '68a09fc5-ea2e-4778-af4d-f89635118b85', v_donor_user_id, 25, now() - interval '6 hours', ''),
    ('9f5ebd3c-6d8d-410d-bcf0-e672cc2afd04', 'be94380a-f550-4bc2-b62d-f0f5855bd516', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-9f5ebd3c-6d8d-410d-bcf0-e672cc2afd04', 'expired', 10, now() - interval '80 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('a4104e51-0595-4f35-9172-802ff5ac4b14', '074b31cc-f2f5-465d-aa97-fb1ec048cda5', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-a4104e51-0595-4f35-9172-802ff5ac4b14', 'expired', 12, now() - interval '80 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('eb187c88-a1a4-4a37-b506-51e0e0203ccb', '074b31cc-f2f5-465d-aa97-fb1ec048cda5', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-eb187c88-a1a4-4a37-b506-51e0e0203ccb', 'expired', 12, now() - interval '84 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('8a12e667-326c-47e1-b7de-80d54dea5657', 'e0c9d9d5-54d2-42a1-bd12-566076725a9c', v_rescue_org_1, '68a09fc5-ea2e-4778-af4d-f89635118b85', 'seed-8a12e667-326c-47e1-b7de-80d54dea5657', 'superseded', 12, now() - interval '12 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, ''),
    ('a6df52a8-474d-4aaf-9583-8cd230c5d8af', 'e0c9d9d5-54d2-42a1-bd12-566076725a9c', v_rescue_org_2, '2121e0e6-0353-418a-a3b6-fc9abab7b3d5', 'seed-a6df52a8-474d-4aaf-9583-8cd230c5d8af', 'superseded', 12, now() - interval '14 hours', NULL, NULL, '', NULL, '', NULL, NULL, NULL, NULL, NULL, '')
  ON CONFLICT (id) DO NOTHING;
END $$;
