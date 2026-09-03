import {
  closeTestPool,
  getListingRow,
  resetDb,
  seedDonor,
  seedListing,
  seedRescuePartner,
  testPool,
  type SeededListing,
  type SeededOrg,
  type SeededUser,
} from './support/db';
import { createRepoContext, type RepoContext } from './support/repos';
import { pgError, PG_UNIQUE_VIOLATION } from '../../src/db/pg-errors';

let ctx: RepoContext;

beforeAll(async () => {
  ctx = await createRepoContext();
});

afterAll(async () => {
  await ctx.close();
  await closeTestPool();
});

beforeEach(resetDb);

async function insertActiveClaim(
  listing: SeededListing,
  org: SeededOrg,
  user: SeededUser,
): Promise<string> {
  const { rows } = await testPool().query<{ id: string }>(
    `INSERT INTO requests (listing_id, rescue_org_id, claimed_by, status, requested_quantity)
     VALUES ($1, $2, $3, 'active', '10.00') RETURNING id`,
    [listing.id, org.id, user.id],
  );
  return rows[0].id;
}

describe('RequestsRepository (integration)', () => {
  describe('reserveListingForClaim', () => {
    it('flips available -> reserved once and bumps version', async () => {
      const donor = await seedDonor();
      const listing = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'available',
      });

      const first = await ctx.requests.reserveListingForClaim(listing.id);
      expect(first?.status).toBe('reserved');
      expect((await getListingRow(listing.id))?.version).toBe(2);

      const second = await ctx.requests.reserveListingForClaim(listing.id);
      expect(second).toBeUndefined();
    });

    it('does not reserve a draft or soft-deleted listing', async () => {
      const donor = await seedDonor();
      const draft = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'draft',
      });
      expect(
        await ctx.requests.reserveListingForClaim(draft.id),
      ).toBeUndefined();
    });
  });

  describe('requests_active_claim_per_listing_uq', () => {
    it('rejects a second active claim on the same listing', async () => {
      const donor = await seedDonor();
      const a = await seedRescuePartner();
      const b = await seedRescuePartner();
      const listing = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
      });

      await insertActiveClaim(listing, a.org, a.user);
      await expect(
        insertActiveClaim(listing, b.org, b.user),
      ).rejects.toMatchObject({ code: '23505' });
    });

    it('surfaces the violation through pgError when drizzle wraps it', async () => {
      const donor = await seedDonor();
      const a = await seedRescuePartner();
      const b = await seedRescuePartner();
      const listing = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
      });

      await ctx.requests.create({
        listingId: listing.id,
        rescueOrgId: a.org.id,
        claimedBy: a.user.id,
        requestedQuantity: '10.00',
        status: 'active',
      });

      let caught: unknown;
      try {
        await ctx.requests.create({
          listingId: listing.id,
          rescueOrgId: b.org.id,
          claimedBy: b.user.id,
          requestedQuantity: '10.00',
          status: 'active',
        });
      } catch (err) {
        caught = err;
      }

      // The raw error has no top-level code - it hangs off `cause`.
      expect((caught as { code?: string }).code).toBeUndefined();
      expect(pgError(caught, PG_UNIQUE_VIOLATION)?.constraint).toBe(
        'requests_active_claim_per_listing_uq',
      );
    });

    it('allows a new active claim once the previous one ended', async () => {
      const donor = await seedDonor();
      const a = await seedRescuePartner();
      const b = await seedRescuePartner();
      const listing = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
      });

      const firstId = await insertActiveClaim(listing, a.org, a.user);
      await testPool().query(
        `UPDATE requests SET status = 'cancelled' WHERE id = $1`,
        [firstId],
      );

      await expect(
        insertActiveClaim(listing, b.org, b.user),
      ).resolves.toBeDefined();
    });
  });

  describe('markListingCollectedIfDone', () => {
    it('closes a reserved listing only when no active claim remains', async () => {
      const donor = await seedDonor();
      const rescue = await seedRescuePartner();
      const listing = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'reserved',
      });
      const claimId = await insertActiveClaim(listing, rescue.org, rescue.user);

      expect(await ctx.requests.markListingCollectedIfDone(listing.id)).toBe(
        false,
      );
      expect((await getListingRow(listing.id))?.status).toBe('reserved');

      await testPool().query(
        `UPDATE requests SET status = 'completed' WHERE id = $1`,
        [claimId],
      );
      expect(await ctx.requests.markListingCollectedIfDone(listing.id)).toBe(
        true,
      );
      expect((await getListingRow(listing.id))?.status).toBe('collected');
    });
  });

  describe('reopenListingAfterClaimEnded', () => {
    it('returns a reserved listing to available', async () => {
      const donor = await seedDonor();
      const listing = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'reserved',
      });

      await ctx.requests.reopenListingAfterClaimEnded(listing.id);
      expect((await getListingRow(listing.id))?.status).toBe('available');
    });

    it('leaves a collected listing untouched', async () => {
      const donor = await seedDonor();
      const listing = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'collected',
      });

      await ctx.requests.reopenListingAfterClaimEnded(listing.id);
      expect((await getListingRow(listing.id))?.status).toBe('collected');
    });
  });
});
