import {
  closeTestPool,
  getListingRow,
  getRequestRow,
  resetDb,
  seedDonor,
  seedListing,
  seedRequest,
  seedRescuePartner,
  testPool,
  type SeededListing,
} from './support/db';
import { createRepoContext, type RepoContext } from './support/repos';

const HOUR = 60 * 60 * 1000;
const pastWindow = () => ({
  pickupWindowStart: new Date(Date.now() - 3 * HOUR),
  pickupWindowEnd: new Date(Date.now() - HOUR),
});

let ctx: RepoContext;

beforeAll(async () => {
  ctx = await createRepoContext();
});

afterAll(async () => {
  await ctx.close();
  await closeTestPool();
});

beforeEach(resetDb);

describe('ListingsRepository (integration)', () => {
  describe('findById', () => {
    it('returns a live listing and hides a soft-deleted one', async () => {
      const { org, user } = await seedDonor();
      const listing = await seedListing({
        donorOrgId: org.id,
        createdBy: user.id,
      });

      expect(await ctx.listings.findById(listing.id)).toMatchObject({
        id: listing.id,
        status: 'available',
      });

      await ctx.listings.delete(listing.id, 2);
      expect(await ctx.listings.findById(listing.id)).toBeUndefined();
    });
  });

  describe('updateWithVersion', () => {
    it('updates only when the expected version still matches', async () => {
      const { org, user } = await seedDonor();
      const listing = await seedListing({
        donorOrgId: org.id,
        createdBy: user.id,
      });

      const updated = await ctx.listings.updateWithVersion(listing.id, 1, {
        description: 'Updated once',
        version: 2,
      });
      expect(updated?.version).toBe(2);

      const stale = await ctx.listings.updateWithVersion(listing.id, 1, {
        description: 'Stale write',
        version: 2,
      });
      expect(stale).toBeUndefined();

      const row = await getListingRow(listing.id);
      expect(row?.version).toBe(2);
    });

    it('will not touch a soft-deleted row', async () => {
      const { org, user } = await seedDonor();
      const listing = await seedListing({
        donorOrgId: org.id,
        createdBy: user.id,
      });
      await ctx.listings.delete(listing.id, 2);

      const revived = await ctx.listings.updateWithVersion(listing.id, 1, {
        status: 'available',
        version: 2,
      });
      expect(revived).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('is a no-op the second time', async () => {
      const { org, user } = await seedDonor();
      const listing = await seedListing({
        donorOrgId: org.id,
        createdBy: user.id,
      });

      expect(await ctx.listings.delete(listing.id, 2)).toBeDefined();
      expect(await ctx.listings.delete(listing.id, 3)).toBeUndefined();

      const row = await getListingRow(listing.id);
      expect(row?.version).toBe(2);
      expect(row?.deleted_at).toBeInstanceOf(Date);
    });
  });

  describe('listing_images ON DELETE CASCADE', () => {
    it('keeps the image rows on a soft-delete but drops them on a hard-delete', async () => {
      const { org, user } = await seedDonor();
      const listing = await seedListing({
        donorOrgId: org.id,
        createdBy: user.id,
      });
      const pool = testPool();
      await pool.query(
        `INSERT INTO listing_images (listing_id, s3_key, position) VALUES ($1, 'a.jpg', 0)`,
        [listing.id],
      );

      await ctx.listings.delete(listing.id, 2);
      expect(
        (
          await pool.query(
            `SELECT 1 FROM listing_images WHERE listing_id = $1`,
            [listing.id],
          )
        ).rows,
      ).toHaveLength(1);

      await pool.query(`DELETE FROM listings WHERE id = $1`, [listing.id]);
      expect(
        (
          await pool.query(
            `SELECT 1 FROM listing_images WHERE listing_id = $1`,
            [listing.id],
          )
        ).rows,
      ).toHaveLength(0);
    });
  });

  describe('available_listing_is_complete CHECK', () => {
    it('rejects publishing a listing with missing fields', async () => {
      const { org, user } = await seedDonor();
      const draft = await seedListing({
        donorOrgId: org.id,
        createdBy: user.id,
        status: 'draft',
      });

      await expect(
        ctx.listings.updateWithVersion(draft.id, 1, {
          status: 'available',
          version: 2,
        }),
      ).rejects.toMatchObject({ cause: { code: '23514' } });
    });
  });

  describe('draft_has_no_published_at CHECK', () => {
    it('rejects a draft carrying a publication time', async () => {
      const { org, user } = await seedDonor();
      const draft = await seedListing({
        donorOrgId: org.id,
        createdBy: user.id,
        status: 'draft',
      });

      await expect(
        ctx.listings.updateWithVersion(draft.id, 1, {
          publishedAt: new Date(),
          version: 2,
        }),
      ).rejects.toMatchObject({ cause: { code: '23514' } });
    });

    it('rejects unpublishing without clearing the publication time', async () => {
      const { org, user } = await seedDonor();
      const listing = await seedListing({
        donorOrgId: org.id,
        createdBy: user.id,
        status: 'available',
      });

      await expect(
        ctx.listings.updateWithVersion(listing.id, 1, {
          status: 'draft',
          version: 2,
        }),
      ).rejects.toMatchObject({ cause: { code: '23514' } });
    });
  });

  describe('findMany visibility', () => {
    it('shows outsiders only available listings, owners every status', async () => {
      const donor = await seedDonor();
      const outsider = await seedRescuePartner();

      const available = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'available',
      });
      const reserved = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'reserved',
      });

      const asOutsider = await ctx.listings.findMany(
        {},
        { userId: outsider.user.id, role: 'user', orgId: outsider.org.id },
      );
      expect(asOutsider.map((l) => l.id)).toEqual([available.id]);

      const asOwner = await ctx.listings.findMany(
        {},
        { userId: donor.user.id, role: 'user', orgId: donor.org.id },
      );
      expect(asOwner.map((l) => l.id).sort()).toEqual(
        [available.id, reserved.id].sort(),
      );
    });
  });

  describe('findOverdueListingIds', () => {
    it('returns only available and reserved listings past their pickup window', async () => {
      const { org, user } = await seedDonor();
      const seed = (
        status: SeededListing['status'],
        window: Partial<ReturnType<typeof pastWindow>> = pastWindow(),
      ) =>
        seedListing({
          donorOrgId: org.id,
          createdBy: user.id,
          status,
          ...window,
        });

      const available = await seed('available');
      const reserved = await seed('reserved');
      await seed('available', {});
      await seed('cancelled');
      await seed('collected');
      await seed('expired');
      const deleted = await seed('available');
      await testPool().query(
        `UPDATE listings SET deleted_at = now() WHERE id = $1`,
        [deleted.id],
      );

      const ids = await ctx.listings.findOverdueListingIds(new Date());

      expect(ids.sort()).toEqual([available.id, reserved.id].sort());
    });
  });

  describe('expireListing', () => {
    it('expires an overdue listing and its active claim, and is a no-op the second time', async () => {
      const donor = await seedDonor();
      const rescue = await seedRescuePartner();
      const overdue = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'reserved',
        ...pastWindow(),
      });
      const claim = await seedRequest({
        listingId: overdue.id,
        rescueOrgId: rescue.org.id,
        claimedBy: rescue.user.id,
      });

      const first = await ctx.db.transaction((tx) =>
        ctx.listings.expireListing(overdue.id, new Date(), tx),
      );
      const second = await ctx.db.transaction((tx) =>
        ctx.listings.expireListing(overdue.id, new Date(), tx),
      );

      expect(first).toEqual({ claimId: claim.id });
      expect(second).toBeUndefined();
      expect(await getListingRow(overdue.id)).toMatchObject({
        status: 'expired',
        version: 2,
      });
      expect((await getRequestRow(claim.id))?.status).toBe('expired');
    });

    it('leaves a listing that is not yet due untouched', async () => {
      const { org, user } = await seedDonor();
      const future = await seedListing({
        donorOrgId: org.id,
        createdBy: user.id,
      });

      const result = await ctx.db.transaction((tx) =>
        ctx.listings.expireListing(future.id, new Date(), tx),
      );

      expect(result).toBeUndefined();
      expect((await getListingRow(future.id))?.status).toBe('available');
    });
  });
});
