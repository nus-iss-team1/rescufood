import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  closeTestPool,
  resetDb,
  seedDonor,
  seedListing,
  seedRequest,
  seedRescuePartner,
  seedUser,
} from './support/db';
import { authHeaders, body, createTestApp, type TestApp } from './support/app';

interface OrgSummaryBody {
  orgId: string;
  listings: Record<string, number>;
  claims: Record<string, number>;
  asOf: string;
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

function getSummary(
  user: { cognitoSub: string },
  role: 'user' | 'admin' = 'user',
) {
  return request(harness.server)
    .get('/api/summary')
    .set(authHeaders(user, role));
}

describe('Summary HTTP (integration)', () => {
  it('counts the listings a donor org posted and the claims against them', async () => {
    const donor = await seedDonor();
    const rescue = await seedRescuePartner();
    const listings = await Promise.all([
      seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'draft',
      }),
      seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'available',
      }),
      seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'available',
      }),
      seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'collected',
      }),
    ]);
    await seedRequest({
      listingId: listings[3].id,
      rescueOrgId: rescue.org.id,
      claimedBy: rescue.user.id,
      status: 'completed',
    });
    await seedRequest({
      listingId: listings[1].id,
      rescueOrgId: rescue.org.id,
      claimedBy: rescue.user.id,
      status: 'cancelled',
    });

    const res = await getSummary(donor.user).expect(200);

    expect(body<OrgSummaryBody>(res)).toMatchObject({
      orgId: donor.org.id,
      listings: {
        draft: 1,
        available: 2,
        reserved: 0,
        collected: 1,
        expired: 0,
        cancelled: 0,
        total: 4,
      },
      claims: {
        active: 0,
        cancelled: 1,
        completed: 1,
        no_show: 0,
        expired: 0,
        total: 2,
      },
    });
  });

  // the rescue partner's side of the same claim.
  it('counts the claims a rescue partner filed, and no listings', async () => {
    const donor = await seedDonor();
    const rescue = await seedRescuePartner();
    const listing = await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'reserved',
    });
    await seedRequest({
      listingId: listing.id,
      rescueOrgId: rescue.org.id,
      claimedBy: rescue.user.id,
      status: 'active',
    });

    const res = await getSummary(rescue.user).expect(200);
    const summary = body<OrgSummaryBody>(res);

    expect(summary.orgId).toBe(rescue.org.id);
    expect(summary.listings.total).toBe(0);
    expect(summary.claims).toMatchObject({ active: 1, total: 1 });
  });

  it('excludes listings and claims belonging to another organisation', async () => {
    const donor = await seedDonor();
    const otherDonor = await seedDonor();
    const rescue = await seedRescuePartner();
    const otherRescue = await seedRescuePartner();

    await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'available',
    });
    const othersListing = await seedListing({
      donorOrgId: otherDonor.org.id,
      createdBy: otherDonor.user.id,
      status: 'available',
    });
    await seedRequest({
      listingId: othersListing.id,
      rescueOrgId: otherRescue.org.id,
      claimedBy: otherRescue.user.id,
      status: 'active',
    });

    const donorRes = await getSummary(donor.user).expect(200);
    expect(body<OrgSummaryBody>(donorRes)).toMatchObject({
      listings: { available: 1, total: 1 },
      claims: { total: 0 },
    });

    const rescueRes = await getSummary(rescue.user).expect(200);
    expect(body<OrgSummaryBody>(rescueRes)).toMatchObject({
      listings: { total: 0 },
      claims: { total: 0 },
    });
  });

  // an admin gets their own org's figures, not the platform's.
  it('scopes an admin caller to their own organisation', async () => {
    const donor = await seedDonor();
    const otherDonor = await seedDonor();
    const admin = await seedUser({ orgId: donor.org.id, isAdmin: true });

    await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'available',
    });
    await seedListing({
      donorOrgId: otherDonor.org.id,
      createdBy: otherDonor.user.id,
      status: 'available',
    });

    const res = await getSummary(admin, 'admin').expect(200);

    expect(body<OrgSummaryBody>(res)).toMatchObject({
      orgId: donor.org.id,
      listings: { available: 1, total: 1 },
    });
  });

  it('returns every defined status at zero for an org with no records', async () => {
    const donor = await seedDonor();

    const res = await getSummary(donor.user).expect(200);

    expect(body<OrgSummaryBody>(res)).toMatchObject({
      listings: {
        draft: 0,
        available: 0,
        reserved: 0,
        collected: 0,
        expired: 0,
        cancelled: 0,
        total: 0,
      },
      claims: {
        active: 0,
        cancelled: 0,
        completed: 0,
        no_show: 0,
        expired: 0,
        total: 0,
      },
    });
  });

  it('reflects committed status changes on the next request', async () => {
    const donor = await seedDonor();
    const rescue = await seedRescuePartner();
    const listing = await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'available',
    });

    const before = body<OrgSummaryBody>(
      await getSummary(donor.user).expect(200),
    );
    expect(before.listings).toMatchObject({ available: 1, reserved: 0 });
    expect(before.claims).toMatchObject({ active: 0 });

    // Claiming reserves the listing and opens a claim in one transaction.
    await request(harness.server)
      .post('/api/requests')
      .set(authHeaders(rescue.user))
      .send({ listingId: listing.id, idempotencyKey: randomUUID() })
      .expect(201);

    const afterClaim = body<OrgSummaryBody>(
      await getSummary(donor.user).expect(200),
    );
    expect(afterClaim.listings).toMatchObject({ available: 0, reserved: 1 });
    expect(afterClaim.claims).toMatchObject({ active: 1, total: 1 });

    // Withdrawing the listing cancels it and its open claim.
    await request(harness.server)
      .patch(`/api/listings/${listing.id}`)
      .set(authHeaders(donor.user))
      .send({ version: 2, status: 'cancelled', cancelledReason: 'sold out' })
      .expect(200);

    const afterCancel = body<OrgSummaryBody>(
      await getSummary(donor.user).expect(200),
    );
    expect(afterCancel.listings).toMatchObject({ reserved: 0, cancelled: 1 });
    expect(afterCancel.claims).toMatchObject({ active: 0, cancelled: 1 });
  });

  it('stamps the response with the snapshot the counts were read at', async () => {
    const donor = await seedDonor();

    const requestedAt = Date.now();
    const first = body<OrgSummaryBody>(
      await getSummary(donor.user).expect(200),
    );
    const second = body<OrgSummaryBody>(
      await getSummary(donor.user).expect(200),
    );

    const firstAsOf = Date.parse(first.asOf);
    expect(Number.isNaN(firstAsOf)).toBe(false);
    // Bounded either side rather than pinned: the clock is the database's.
    expect(firstAsOf).toBeGreaterThan(requestedAt - 60_000);
    expect(firstAsOf).toBeLessThan(Date.now() + 60_000);
    expect(Date.parse(second.asOf)).toBeGreaterThanOrEqual(firstAsOf);
  });

  it('denies a caller with no organisation, returning no totals', async () => {
    const orgless = await seedUser({ orgId: null });

    const res = await getSummary(orgless).expect(403);

    expect(res.body).not.toHaveProperty('listings');
    expect(res.body).not.toHaveProperty('claims');
  });

  // the auth guard runs before the org lookup, so an unidentified
  // caller is turned away without one.
  it('rejects a caller with no credentials', async () => {
    await request(harness.server).get('/api/summary').expect(403);
  });
});
