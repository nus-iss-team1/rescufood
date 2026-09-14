import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  closeTestPool,
  getListingRow,
  resetDb,
  seedDonor,
  seedListing,
  seedRescuePartner,
} from './support/db';
import { authHeaders, body, createTestApp, type TestApp } from './support/app';

interface ClaimBody {
  id: string;
  listingId: string;
  status: string;
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

describe('Requests HTTP (integration)', () => {
  it('claims an available listing and reserves it', async () => {
    const donor = await seedDonor();
    const rescue = await seedRescuePartner();
    const listing = await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'available',
    });

    const res = await request(harness.server)
      .post('/api/requests')
      .set(authHeaders(rescue.user))
      .send({ listingId: listing.id, idempotencyKey: randomUUID() })
      .expect(201);

    expect(body<ClaimBody>(res)).toMatchObject({
      listingId: listing.id,
      status: 'active',
    });
    expect((await getListingRow(listing.id))?.status).toBe('reserved');
  });

  it('is first-come-first-served: a second org cannot claim a reserved listing', async () => {
    const donor = await seedDonor();
    const first = await seedRescuePartner();
    const second = await seedRescuePartner();
    const listing = await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'available',
    });

    await request(harness.server)
      .post('/api/requests')
      .set(authHeaders(first.user))
      .send({ listingId: listing.id, idempotencyKey: randomUUID() })
      .expect(201);

    await request(harness.server)
      .post('/api/requests')
      .set(authHeaders(second.user))
      .send({ listingId: listing.id, idempotencyKey: randomUUID() })
      .expect(400);

    expect((await getListingRow(listing.id))?.status).toBe('reserved');
  });

  it('replays the original claim on an identical retry', async () => {
    const donor = await seedDonor();
    const rescue = await seedRescuePartner();
    const listing = await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'available',
    });
    const payload = { listingId: listing.id, idempotencyKey: randomUUID() };

    const first = await request(harness.server)
      .post('/api/requests')
      .set(authHeaders(rescue.user))
      .send(payload)
      .expect(201);

    const retry = await request(harness.server)
      .post('/api/requests')
      .set(authHeaders(rescue.user))
      .send(payload)
      .expect(201);

    expect(body<ClaimBody>(retry).id).toBe(body<ClaimBody>(first).id);
  });

  it('rejects claiming a draft listing with 400', async () => {
    const donor = await seedDonor();
    const rescue = await seedRescuePartner();
    const listing = await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'draft',
    });

    await request(harness.server)
      .post('/api/requests')
      .set(authHeaders(rescue.user))
      .send({ listingId: listing.id, idempotencyKey: randomUUID() })
      .expect(400);
  });
});
