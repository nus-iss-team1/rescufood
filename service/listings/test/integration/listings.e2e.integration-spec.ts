import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  closeTestPool,
  getListingRow,
  resetDb,
  seedDonor,
  seedListing,
  seedRescuePartner,
  seedUser,
} from './support/db';
import { authHeaders, body, createTestApp, type TestApp } from './support/app';

interface ListingBody {
  id: string;
  status: string;
  description: string | null;
  createdBy: string;
  publishedAt: string | null;
}

interface ListingPage {
  items: { id: string }[];
  total: number;
}

let harness: TestApp;

beforeAll(async () => {
  harness = await createTestApp();
});

afterAll(async () => {
  await harness.close();
  await closeTestPool();
});

beforeEach(resetDb);

describe('Listings HTTP (integration)', () => {
  it('lets a donor-org member create a draft listing', async () => {
    const { user } = await seedDonor();

    const res = await request(harness.server)
      .post('/api/listings')
      .set(authHeaders(user))
      .send({ description: 'Surplus bagels', quantity: 12, unit: 'bags' })
      .expect(201);

    const created = body<ListingBody>(res);
    expect(created).toMatchObject({
      status: 'draft',
      description: 'Surplus bagels',
      createdBy: user.id,
    });
    expect((await getListingRow(created.id))?.status).toBe('draft');
  });

  it('rejects a non-donor org with 403', async () => {
    const { user } = await seedRescuePartner();

    await request(harness.server)
      .post('/api/listings')
      .set(authHeaders(user))
      .send({ description: 'nope' })
      .expect(403);
  });

  it('rejects a caller with no organisation with 403', async () => {
    const orphan = await seedUser({ orgId: null });

    await request(harness.server)
      .post('/api/listings')
      .set(authHeaders(orphan))
      .send({ description: 'nope' })
      .expect(403);
  });

  it('shows an outsider only available listings', async () => {
    const donor = await seedDonor();
    const outsider = await seedRescuePartner();
    const available = await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'available',
    });
    await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'draft',
    });

    const res = await request(harness.server)
      .get('/api/listings')
      .set(authHeaders(outsider.user))
      .expect(200);

    const page = body<ListingPage>(res);
    expect(page.items.map((l) => l.id)).toEqual([available.id]);
    expect(page.total).toBe(1);
  });

  it('409s a PATCH that carries a stale version', async () => {
    const donor = await seedDonor();
    const listing = await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'draft',
    });

    await request(harness.server)
      .patch(`/api/listings/${listing.id}`)
      .set(authHeaders(donor.user))
      .send({ version: 1, description: 'first write' })
      .expect(200);

    await request(harness.server)
      .patch(`/api/listings/${listing.id}`)
      .set(authHeaders(donor.user))
      .send({ version: 1, description: 'stale write' })
      .expect(409);
  });

  it('soft-deletes on DELETE', async () => {
    const donor = await seedDonor();
    const listing = await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'draft',
    });

    await request(harness.server)
      .delete(`/api/listings/${listing.id}`)
      .set(authHeaders(donor.user))
      .expect(204);

    expect((await getListingRow(listing.id))?.deleted_at).toBeInstanceOf(Date);

    await request(harness.server)
      .get(`/api/listings/${listing.id}`)
      .set(authHeaders(donor.user))
      .expect(404);
  });

  describe('published_at', () => {
    function completeDraft() {
      const start = Date.now() + 24 * 60 * 60 * 1000;
      return {
        category: 'bakery',
        description: 'Sourdough loaves',
        quantity: 12,
        unit: 'loaves',
        allergens: ['gluten'],
        pickupLocation: '12 Baker St',
        pickupWindowStart: new Date(start).toISOString(),
        pickupWindowEnd: new Date(start + 8 * 60 * 60 * 1000).toISOString(),
        useBy: new Date(start + 32 * 60 * 60 * 1000).toISOString(),
      };
    }

    function setStatus(
      user: { cognitoSub: string },
      id: string,
      version: number,
      status: string,
      extra: object = {},
    ) {
      return request(harness.server)
        .patch(`/api/listings/${id}`)
        .set(authHeaders(user))
        .send({ version, status, ...extra })
        .expect(200);
    }

    it('stamps it on publish, clears it on unpublish and restamps on republish', async () => {
      const donor = await seedDonor();
      const created = body<ListingBody>(
        await request(harness.server)
          .post('/api/listings')
          .set(authHeaders(donor.user))
          .send(completeDraft())
          .expect(201),
      );
      expect((await getListingRow(created.id))?.published_at).toBeNull();

      const published = body<ListingBody>(
        await setStatus(donor.user, created.id, 1, 'available'),
      );
      const first = (await getListingRow(created.id))?.published_at;
      expect(first).toBeInstanceOf(Date);
      expect(Date.parse(published.publishedAt!)).toBe(first!.getTime());

      await setStatus(donor.user, created.id, 2, 'draft');
      expect((await getListingRow(created.id))?.published_at).toBeNull();

      await setStatus(donor.user, created.id, 3, 'available');
      const second = (await getListingRow(created.id))?.published_at;
      expect(second!.getTime()).toBeGreaterThan(first!.getTime());
    });

    it('keeps it when a cancelled claim releases the listing', async () => {
      const donor = await seedDonor();
      const rescue = await seedRescuePartner();
      const listing = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'available',
        pickupWindowStart: new Date(Date.now() + 5 * 60 * 60 * 1000),
        pickupWindowEnd: new Date(Date.now() + 9 * 60 * 60 * 1000),
      });
      const before = (await getListingRow(listing.id))?.published_at;

      const claim = body<{ id: string }>(
        await request(harness.server)
          .post('/api/requests')
          .set(authHeaders(rescue.user))
          .send({ listingId: listing.id, idempotencyKey: randomUUID() })
          .expect(201),
      );
      await request(harness.server)
        .patch(`/api/requests/${claim.id}`)
        .set(authHeaders(rescue.user))
        .send({ status: 'cancelled', cancellationReason: 'Van broke down' })
        .expect(200);

      const after = await getListingRow(listing.id);
      expect(after?.status).toBe('available');
      expect(after?.published_at).toEqual(before);
    });

    it('keeps it when a donor cancels a published listing', async () => {
      const donor = await seedDonor();
      const listing = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'available',
      });
      const before = (await getListingRow(listing.id))?.published_at;

      await setStatus(donor.user, listing.id, 1, 'cancelled', {
        cancelledReason: 'Fridge failed',
      });

      expect((await getListingRow(listing.id))?.published_at).toEqual(before);
    });
  });

  describe('cancelling a listing', () => {
    async function seedOwned(status: 'draft' | 'available') {
      const donor = await seedDonor();
      const listing = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status,
      });
      return { donor, listing };
    }

    it.each(['draft', 'available'] as const)(
      'cancels a %s listing with a reason',
      async (status) => {
        const { donor, listing } = await seedOwned(status);

        const res = await request(harness.server)
          .patch(`/api/listings/${listing.id}`)
          .set(authHeaders(donor.user))
          .send({
            version: 1,
            status: 'cancelled',
            cancelledReason: ' Fridge failed ',
          })
          .expect(200);

        expect(
          body<ListingBody & { cancelledReason: string }>(res),
        ).toMatchObject({
          status: 'cancelled',
          cancelledReason: 'Fridge failed',
        });
      },
    );

    it.each([
      ['missing', {}],
      ['blank', { cancelledReason: '   ' }],
    ])('rejects a cancellation whose reason is %s', async (_label, extra) => {
      const { donor, listing } = await seedOwned('available');

      await request(harness.server)
        .patch(`/api/listings/${listing.id}`)
        .set(authHeaders(donor.user))
        .send({ version: 1, status: 'cancelled', ...extra })
        .expect(400);

      expect((await getListingRow(listing.id))?.status).toBe('available');
    });

    it('records the actor, reason and time in the listing history', async () => {
      const { donor, listing } = await seedOwned('available');
      await request(harness.server)
        .patch(`/api/listings/${listing.id}`)
        .set(authHeaders(donor.user))
        .send({
          version: 1,
          status: 'cancelled',
          cancelledReason: 'Fridge failed',
        })
        .expect(200);

      const admin = await seedUser({ orgId: null });
      const res = await request(harness.server)
        .get(`/api/audit/listing/${listing.id}`)
        .set(authHeaders(admin, 'admin'))
        .expect(200);

      const events = body<{
        items: {
          action: string;
          userId: string | null;
          orgId: string | null;
          reason: string;
          createdAt: string;
        }[];
      }>(res).items;
      const cancelled = events.find((e) => e.action === 'listing.cancelled');
      expect(cancelled).toMatchObject({
        userId: donor.user.id,
        orgId: donor.org.id,
        reason: 'Fridge failed',
      });
      expect(Date.parse(cancelled!.createdAt)).not.toBeNaN();
    });

    it('hides a cancelled listing from browse and refuses a claim on it', async () => {
      const { donor, listing } = await seedOwned('available');
      const rescue = await seedRescuePartner();
      await request(harness.server)
        .patch(`/api/listings/${listing.id}`)
        .set(authHeaders(donor.user))
        .send({
          version: 1,
          status: 'cancelled',
          cancelledReason: 'Fridge failed',
        })
        .expect(200);

      const page = body<ListingPage>(
        await request(harness.server)
          .get('/api/listings')
          .set(authHeaders(rescue.user))
          .expect(200),
      );
      expect(page.items.map((l) => l.id)).not.toContain(listing.id);

      await request(harness.server)
        .post('/api/requests')
        .set(authHeaders(rescue.user))
        .send({ listingId: listing.id, idempotencyKey: randomUUID() })
        .expect(400);
    });
  });
});
