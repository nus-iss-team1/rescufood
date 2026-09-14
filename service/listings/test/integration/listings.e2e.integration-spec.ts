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
});
