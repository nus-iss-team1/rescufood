import {
  closeTestPool,
  getListingRow,
  resetDb,
  seedDonor,
  seedListing,
  seedRescuePartner,
  testPool,
} from './support/db';
import { createRepoContext, type RepoContext } from './support/repos';

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

  describe('expireOverdue', () => {
    it('expires listings past their pickup window and their active claims', async () => {
      const donor = await seedDonor();
      const rescue = await seedRescuePartner();

      const overdue = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'reserved',
        pickupWindowStart: new Date(Date.now() - 3 * 60 * 60 * 1000),
        pickupWindowEnd: new Date(Date.now() - 60 * 60 * 1000),
      });
      const future = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'available',
      });
      await testPool().query(
        `INSERT INTO requests (listing_id, rescue_org_id, claimed_by, status, requested_quantity)
         VALUES ($1, $2, $3, 'active', '10.00')`,
        [overdue.id, rescue.org.id, rescue.user.id],
      );

      const result = await ctx.db.transaction((tx) =>
        ctx.listings.expireOverdue(new Date(), tx),
      );

      expect(result.listingIds).toEqual([overdue.id]);
      expect(result.claimIds).toHaveLength(1);
      expect((await getListingRow(overdue.id))?.status).toBe('expired');
      expect((await getListingRow(future.id))?.status).toBe('available');
    });
  });
});
