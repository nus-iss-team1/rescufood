import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  closeTestPool,
  countAuditActions,
  getListingRow,
  getRequestRow,
  resetDb,
  seedDonor,
  seedListing,
  seedRescuePartner,
  testPool,
  type SeededUser,
} from './support/db';
import { authHeaders, body, createTestApp, type TestApp } from './support/app';
import { hashPickupCode } from '../../src/requests/pickup/pickup-code.util';

/** seedListing's fixed description. */
const SEEDED_DESCRIPTION = 'A tray of day-old sourdough';

interface ClaimBody {
  id: string;
}

interface LookupBody {
  requestId: string;
  listingDescription: string | null;
  requestedQuantity: string;
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

/** Claims a fresh listing and mints its pickup code, as the real flow does. */
async function claimWithCode() {
  const donor = await seedDonor();
  const rescue = await seedRescuePartner();
  const listing = await seedListing({
    donorOrgId: donor.org.id,
    createdBy: donor.user.id,
    status: 'available',
  });

  const claim = await request(harness.server)
    .post('/api/requests')
    .set(authHeaders(rescue.user))
    .send({ listingId: listing.id, idempotencyKey: randomUUID() })
    .expect(201);
  const requestId = body<ClaimBody>(claim).id;

  // Written straight to the row: minting is throttled to 6/min, and these
  // cases cover lookup and verify rather than generation.
  const code = '246813';
  await testPool().query(
    `UPDATE requests
        SET pickup_code_hash = $2,
            code_expires_at = now() + interval '1 hour',
            code_generated_by = $3,
            pickup_code_generated_at = now()
      WHERE id = $1`,
    [requestId, hashPickupCode(code), rescue.user.id],
  );

  return { donor, rescue, listing, requestId, code };
}

const verify = (id: string, user: SeededUser, code: string) =>
  request(harness.server)
    .post(`/api/requests/${id}/verify`)
    .set(authHeaders(user))
    .send({ code });

describe('Pickup code verification (RCF-27)', () => {
  it('resolves a live code to the claim without consuming it', async () => {
    const { donor, requestId, code } = await claimWithCode();

    const res = await request(harness.server)
      .post('/api/requests/lookup-code')
      .set(authHeaders(donor.user))
      .send({ code })
      .expect(201);

    expect(body<LookupBody>(res)).toMatchObject({
      requestId,
      listingDescription: SEEDED_DESCRIPTION,
    });
    const row = await getRequestRow(requestId);
    expect(row?.status).toBe('active');
    expect(row?.pickup_code_attempts).toBe(0);
  });

  it('does not resolve a code belonging to another donor org', async () => {
    const { code } = await claimWithCode();
    const outsider = await seedDonor();

    await request(harness.server)
      .post('/api/requests/lookup-code')
      .set(authHeaders(outsider.user))
      .send({ code })
      .expect(404);
  });

  it('rejects a malformed code with a validation error', async () => {
    const { donor, requestId } = await claimWithCode();

    await verify(requestId, donor.user, 'abc').expect(400);
    expect((await getRequestRow(requestId))?.status).toBe('active');
  });

  it('counts a wrong code as an attempt and leaves the claim active', async () => {
    const { donor, requestId } = await claimWithCode();
    const wrong = '135792';

    await verify(requestId, donor.user, wrong).expect(400);

    const row = await getRequestRow(requestId);
    expect(row?.status).toBe('active');
    expect(row?.pickup_code_attempts).toBe(1);
    expect(row?.verified_by).toBeNull();
  });

  it('denies verification by a donor from another org', async () => {
    const { requestId, code } = await claimWithCode();
    const outsider = await seedDonor();

    await verify(requestId, outsider.user, code).expect(403);
    expect((await getRequestRow(requestId))?.status).toBe('active');
  });
});

describe('Pickup completion is single-use (RCF-28)', () => {
  it('completes the claim and marks the listing collected', async () => {
    const { donor, listing, requestId, code } = await claimWithCode();

    await verify(requestId, donor.user, code).expect(201);

    const row = await getRequestRow(requestId);
    expect(row?.status).toBe('completed');
    expect(row?.verified_by).toBe(donor.user.id);
    expect(row?.collected_at).not.toBeNull();
    expect((await getListingRow(listing.id))?.status).toBe('collected');
  });

  it('replays success when the same donor resubmits the same code', async () => {
    const { donor, requestId, code } = await claimWithCode();
    await verify(requestId, donor.user, code).expect(201);

    await verify(requestId, donor.user, code).expect(201);

    expect(await countAuditActions('claim.completed', requestId)).toBe(1);
  });

  it('rejects a different code once the claim is completed', async () => {
    const { donor, requestId, code } = await claimWithCode();
    await verify(requestId, donor.user, code).expect(201);
    const other = '135792';

    await verify(requestId, donor.user, other).expect(400);

    expect(await countAuditActions('claim.completed', requestId)).toBe(1);
  });

  it('completes at most once when two verifications race', async () => {
    const { donor, listing, requestId, code } = await claimWithCode();

    const outcomes = await Promise.all([
      verify(requestId, donor.user, code),
      verify(requestId, donor.user, code),
    ]);

    // One wins outright; the loser either replays the win or 409s on the
    // compare-and-swap, depending on which side of the commit it lands.
    const statuses = outcomes.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201).length).toBeGreaterThanOrEqual(1);
    expect(statuses.every((s) => s === 201 || s === 409)).toBe(true);

    expect((await getRequestRow(requestId))?.status).toBe('completed');
    expect((await getListingRow(listing.id))?.status).toBe('collected');
    expect(await countAuditActions('claim.completed', requestId)).toBe(1);
  });
});
