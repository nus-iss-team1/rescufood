import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  closeTestPool,
  resetDb,
  seedDonor,
  seedListing,
  seedOrg,
  seedRequest,
  seedRescuePartner,
  seedUser,
  type SeededOrg,
} from './support/db';
import { authHeaders, body, createTestApp, type TestApp } from './support/app';

interface OrgSummaryBody {
  orgId: string;
  listings: Record<string, number>;
  claims: Record<string, number>;
  asOf: string;
}

interface RescuedMetricsBody {
  orgId: string;
  rescuedByUnit: {
    unit: string;
    amount: number;
    formattedAmount: string;
    lots: number;
  }[];
  lotsCollected: number;
  claimsCompleted: number;
  avgTimeToClaimMs: number | null;
  medianTimeToClaimMs: number | null;
  formattedAvgTimeToClaim: string;
  formattedMedianTimeToClaim: string;
  timeToClaimCount: number;
  asOf: string;
}

const MIN = 60_000;
const HR = 60 * MIN;
const DAY = 24 * HR;

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
    .get('/api/stats/summary')
    .set(authHeaders(user, role));
}

describe('GET /api/stats/summary (integration)', () => {
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
    await request(harness.server).get('/api/stats/summary').expect(401);
  });
});

function getMetrics(
  user: { cognitoSub: string },
  role: 'user' | 'admin' = 'user',
) {
  return request(harness.server)
    .get('/api/stats/metrics')
    .set(authHeaders(user, role));
}

describe('GET /api/stats/metrics (integration)', () => {
  // Published a day after the rows are created, so measuring from created_at would be off by a day.
  const publishedAt = new Date(Date.now() + DAY);
  const at = (ms: number) => new Date(publishedAt.getTime() + ms);

  // Collected and claimed lots for one donor, two rescue partners and an outside donor.
  async function seedControlledData() {
    const donor = await seedDonor();
    const otherDonor = await seedDonor();
    const r1 = await seedRescuePartner();
    const r2 = await seedRescuePartner();

    const lot = (
      owner: typeof donor,
      status: 'collected' | 'available' | 'reserved',
      unit: string,
      quantity: string,
    ) =>
      seedListing({
        donorOrgId: owner.org.id,
        createdBy: owner.user.id,
        status,
        unit,
        quantity,
        publishedAt,
      });
    const claim = (
      listingId: string,
      by: typeof r1,
      status: 'completed' | 'cancelled' | 'no_show' | 'expired' | 'active',
      requestedAt: Date,
      collectedQuantity?: string,
    ) =>
      seedRequest({
        listingId,
        rescueOrgId: by.org.id,
        claimedBy: by.user.id,
        status,
        requestedAt,
        collectedQuantity,
      });

    // Completed: listed quantity always exceeds collected, so the source column is observable.
    const l1 = await lot(donor, 'collected', 'kg', '20.00');
    await claim(l1.id, r1, 'completed', at(30 * MIN), '18.50');
    const l2 = await lot(donor, 'collected', 'Kg ', '10.00');
    await claim(l2.id, r2, 'completed', at(90 * MIN), '6.00');
    const l3 = await lot(donor, 'collected', 'kg', '5.00');
    await claim(l3.id, r1, 'completed', at(4 * HR), '1.25');
    const l4 = await lot(donor, 'collected', 'bottles', '50.00');
    await claim(l4.id, r2, 'completed', at(2 * HR), '44.00');

    // Not completed: each would distort both metrics if it were counted.
    const l5 = await lot(donor, 'available', 'kg', '7.00');
    await claim(l5.id, r1, 'cancelled', at(10 * DAY));
    const l6 = await lot(donor, 'available', 'kg', '3.00');
    await claim(l6.id, r2, 'no_show', at(5 * DAY));
    const l7 = await lot(donor, 'available', 'kg', '9.00');
    await claim(l7.id, r1, 'expired', at(3 * DAY));
    const l8 = await lot(donor, 'reserved', 'kg', '4.00');
    await claim(l8.id, r2, 'active', at(MIN));

    // Another donor's lot: in r1's scope, not the donor's.
    const l9 = await lot(otherDonor, 'collected', 'loaves', '12.00');
    await claim(l9.id, r1, 'completed', at(15 * MIN), '12.00');

    return { donor, otherDonor, r1, r2 };
  }

  it('reconciles a donor org with hand-computed totals', async () => {
    const { donor } = await seedControlledData();

    const res = await getMetrics(donor.user).expect(200);

    // kg: 18.50 + 6.00 + 1.25 over 3 lots; durations 30, 90, 240, 120 mins.
    expect(body<RescuedMetricsBody>(res)).toMatchObject({
      orgId: donor.org.id,
      rescuedByUnit: [
        { unit: 'kg', amount: 25.75, formattedAmount: '25.75', lots: 3 },
        { unit: 'bottles', amount: 44, formattedAmount: '44', lots: 1 },
      ],
      lotsCollected: 4,
      claimsCompleted: 4,
      avgTimeToClaimMs: 120 * MIN,
      medianTimeToClaimMs: 105 * MIN,
      formattedAvgTimeToClaim: '2 hrs',
      formattedMedianTimeToClaim: '1 hr 45 mins',
      timeToClaimCount: 4,
    });
  });

  it('reconciles a rescue partner over the claims it filed, across donors', async () => {
    const { r1 } = await seedControlledData();

    const res = await getMetrics(r1.user).expect(200);

    // kg: 18.50 + 1.25; loaves: 12.00; durations 30, 240, 15 mins.
    expect(body<RescuedMetricsBody>(res)).toMatchObject({
      orgId: r1.org.id,
      rescuedByUnit: [
        { unit: 'kg', amount: 19.75, formattedAmount: '19.75', lots: 2 },
        { unit: 'loaves', amount: 12, formattedAmount: '12', lots: 1 },
      ],
      lotsCollected: 3,
      claimsCompleted: 3,
      avgTimeToClaimMs: 95 * MIN,
      medianTimeToClaimMs: 30 * MIN,
      formattedAvgTimeToClaim: '1 hr 35 mins',
      formattedMedianTimeToClaim: '30 mins',
      timeToClaimCount: 3,
    });
  });

  it('labels a unit group with the spelling its lots used', async () => {
    const { r2 } = await seedControlledData();

    const res = await getMetrics(r2.user).expect(200);

    expect(body<RescuedMetricsBody>(res).rescuedByUnit).toEqual([
      { unit: 'bottles', amount: 44, formattedAmount: '44', lots: 1 },
      { unit: 'Kg', amount: 6, formattedAmount: '6', lots: 1 },
    ]);
  });

  it('counts a lot claimed before its publication time in quantity but not time-to-claim', async () => {
    const donor = await seedDonor();
    const rescue = await seedRescuePartner();
    const listing = await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'collected',
      unit: 'kg',
      publishedAt,
    });
    await seedRequest({
      listingId: listing.id,
      rescueOrgId: rescue.org.id,
      claimedBy: rescue.user.id,
      status: 'completed',
      requestedAt: at(-30 * HR),
      collectedQuantity: '8.00',
    });

    const res = await getMetrics(donor.user).expect(200);

    expect(body<RescuedMetricsBody>(res)).toMatchObject({
      rescuedByUnit: [{ unit: 'kg', amount: 8, lots: 1 }],
      claimsCompleted: 1,
      avgTimeToClaimMs: null,
      formattedAvgTimeToClaim: '--',
      timeToClaimCount: 0,
    });
  });

  it("returns zeros and no durations for an org with no completed claims, despite others' data", async () => {
    await seedControlledData();
    const quiet = await seedDonor();

    const res = await getMetrics(quiet.user).expect(200);

    expect(body<RescuedMetricsBody>(res)).toMatchObject({
      orgId: quiet.org.id,
      rescuedByUnit: [],
      lotsCollected: 0,
      claimsCompleted: 0,
      avgTimeToClaimMs: null,
      medianTimeToClaimMs: null,
      formattedAvgTimeToClaim: '--',
      formattedMedianTimeToClaim: '--',
      timeToClaimCount: 0,
    });
  });

  it('stamps the response with the snapshot the metrics were read at', async () => {
    const donor = await seedDonor();

    const requestedAt = Date.now();
    const metrics = body<RescuedMetricsBody>(
      await getMetrics(donor.user).expect(200),
    );

    const asOf = Date.parse(metrics.asOf);
    expect(asOf).toBeGreaterThan(requestedAt - 60_000);
    expect(asOf).toBeLessThan(Date.now() + 60_000);
  });

  it('denies a caller with no organisation, returning no metrics', async () => {
    const orgless = await seedUser({ orgId: null });

    const res = await getMetrics(orgless).expect(403);

    expect(res.body).not.toHaveProperty('rescuedByUnit');
    expect(res.body).not.toHaveProperty('avgTimeToClaimMs');
  });

  it('rejects a caller with no credentials', async () => {
    await request(harness.server).get('/api/stats/metrics').expect(401);
  });
});

describe('GET /api/stats/* access (integration)', () => {
  const paths = ['/api/stats/summary', '/api/stats/metrics'];

  async function memberOf(
    orgStatus: SeededOrg['status'],
    userStatus = 'active',
  ) {
    const org = await seedOrg({ type: 'donor', status: orgStatus });
    const user = await seedUser({ orgId: org.id, status: userStatus });
    return { org, user };
  }

  it.each([
    ['a member of a pending org', () => memberOf('pending')],
    ['a member of a rejected org', () => memberOf('rejected')],
    [
      'a suspended user in an approved org',
      () => memberOf('approved', 'suspended'),
    ],
  ])('denies %s on both endpoints', async (_, seedCaller) => {
    const { user } = await seedCaller();

    for (const path of paths) {
      const res = await request(harness.server)
        .get(path)
        .set(authHeaders(user))
        .expect(403);
      expect(res.body).not.toHaveProperty('orgId');
    }
  });

  it('denies a suspended org without returning its history', async () => {
    const { org, user } = await memberOf('suspended');
    const rescue = await seedRescuePartner();
    const listing = await seedListing({
      donorOrgId: org.id,
      createdBy: user.id,
      status: 'collected',
    });
    await seedRequest({
      listingId: listing.id,
      rescueOrgId: rescue.org.id,
      claimedBy: rescue.user.id,
      status: 'completed',
    });

    for (const path of paths) {
      const res = await request(harness.server)
        .get(path)
        .set(authHeaders(user))
        .expect(403);
      expect(res.body).not.toHaveProperty('rescuedByUnit');
      expect(res.body).not.toHaveProperty('claims');
    }

    // The same claim still counts for the active partner on the other side.
    const partner = body<RescuedMetricsBody>(
      await getMetrics(rescue.user).expect(200),
    );
    expect(partner.claimsCompleted).toBe(1);
  });
});

describe('GET /api/stats/* period filter (integration)', () => {
  const sgt = (local: string) => new Date(`${local}+08:00`);

  // The first and last instants of March 2026 in Singapore, and one either side.
  const edges = [
    { label: 'beforeFirst', at: sgt('2026-02-28T23:59:59.999'), qty: '1.00' },
    { label: 'firstInstant', at: sgt('2026-03-01T00:00:00.000'), qty: '2.00' },
    { label: 'lastInstant', at: sgt('2026-03-31T23:59:59.999'), qty: '4.00' },
    { label: 'afterLast', at: sgt('2026-04-01T00:00:00.000'), qty: '8.00' },
  ];

  function getStats(
    path: 'summary' | 'metrics',
    user: { cognitoSub: string },
    period: { from?: string; to?: string },
  ) {
    return request(harness.server)
      .get(`/api/stats/${path}`)
      .query(period)
      .set(authHeaders(user));
  }

  // One collected lot per edge, collected at that edge an hour after it was claimed.
  async function seedCollectedAtEdges() {
    const donor = await seedDonor();
    const rescue = await seedRescuePartner();
    for (const edge of edges) {
      const listing = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'collected',
        unit: 'kg',
        quantity: edge.qty,
        publishedAt: new Date(edge.at.getTime() - 2 * HR),
      });
      await seedRequest({
        listingId: listing.id,
        rescueOrgId: rescue.org.id,
        claimedBy: rescue.user.id,
        status: 'completed',
        requestedAt: new Date(edge.at.getTime() - HR),
        collectedQuantity: edge.qty,
        collectedAt: edge.at,
      });
    }
    return { donor, rescue };
  }

  it('counts claims collected from the first through the last Singapore instant of the period', async () => {
    const { donor, rescue } = await seedCollectedAtEdges();
    const march = { from: '2026-03-01', to: '2026-03-31' };

    for (const caller of [donor, rescue]) {
      const res = await getStats('metrics', caller.user, march).expect(200);

      // firstInstant (2) + lastInstant (4); each claimed an hour after publication.
      expect(body<RescuedMetricsBody>(res)).toMatchObject({
        orgId: caller.org.id,
        rescuedByUnit: [{ unit: 'kg', amount: 6, lots: 2 }],
        lotsCollected: 2,
        claimsCompleted: 2,
        avgTimeToClaimMs: HR,
        timeToClaimCount: 2,
      });
    }
  });

  it.each([
    ['only from', { from: '2026-03-01' }, 14, 3],
    ['only to', { to: '2026-03-31' }, 7, 3],
    ['the same single day', { from: '2026-03-01', to: '2026-03-01' }, 2, 1],
    ['no period', {}, 15, 4],
  ])(
    'filters metrics given %s',
    async (_label, period, amount, claimsCompleted) => {
      const { donor } = await seedCollectedAtEdges();

      const res = await getStats('metrics', donor.user, period).expect(200);

      expect(body<RescuedMetricsBody>(res)).toMatchObject({
        rescuedByUnit: [{ unit: 'kg', amount }],
        claimsCompleted,
      });
    },
  );

  it('counts listings created and claims filed within the period', async () => {
    const donor = await seedDonor();
    const rescue = await seedRescuePartner();
    for (const edge of edges) {
      const listing = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'available',
        createdAt: edge.at,
      });
      await seedRequest({
        listingId: listing.id,
        rescueOrgId: rescue.org.id,
        claimedBy: rescue.user.id,
        status: 'cancelled',
        requestedAt: edge.at,
      });
    }
    const march = { from: '2026-03-01', to: '2026-03-31' };

    const donorRes = await getStats('summary', donor.user, march).expect(200);
    expect(body<OrgSummaryBody>(donorRes)).toMatchObject({
      listings: { available: 2, total: 2 },
      claims: { cancelled: 2, total: 2 },
    });

    const rescueRes = await getStats('summary', rescue.user, march).expect(200);
    expect(body<OrgSummaryBody>(rescueRes)).toMatchObject({
      listings: { total: 0 },
      claims: { cancelled: 2, total: 2 },
    });
  });

  it('returns zeros, not an error, when the org has records but none in the period', async () => {
    const { donor } = await seedCollectedAtEdges();
    const year2020 = { from: '2020-01-01', to: '2020-12-31' };

    const summary = await getStats('summary', donor.user, year2020).expect(200);
    expect(body<OrgSummaryBody>(summary)).toMatchObject({
      orgId: donor.org.id,
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

    const metrics = await getStats('metrics', donor.user, year2020).expect(200);
    expect(body<RescuedMetricsBody>(metrics)).toMatchObject({
      orgId: donor.org.id,
      rescuedByUnit: [],
      lotsCollected: 0,
      claimsCompleted: 0,
      avgTimeToClaimMs: null,
      medianTimeToClaimMs: null,
      formattedAvgTimeToClaim: '--',
      formattedMedianTimeToClaim: '--',
      timeToClaimCount: 0,
    });

    // The same org's records are all there once the period covers them.
    const allTime = await getStats('metrics', donor.user, {}).expect(200);
    expect(body<RescuedMetricsBody>(allTime).claimsCompleted).toBe(4);
  });

  it.each([
    ['summary', 'from', '2026-02-30'],
    ['summary', 'to', '2026-03-01T00:00:00Z'],
    ['metrics', 'from', '2026-3-1'],
    ['metrics', 'to', 'last week'],
  ] as const)(
    'rejects a %s request whose %s is %s, returning no figures',
    async (path, field, value) => {
      const donor = await seedDonor();

      const res = await getStats(path, donor.user, { [field]: value }).expect(
        400,
      );

      expect(res.body).not.toHaveProperty('orgId');
    },
  );

  it.each(['summary', 'metrics'] as const)(
    'rejects a %s request whose period ends before it starts, returning no figures',
    async (path) => {
      const { donor } = await seedCollectedAtEdges();

      const res = await getStats(path, donor.user, {
        from: '2026-03-31',
        to: '2026-03-01',
      }).expect(400);

      expect(res.body).toMatchObject({
        message: ['to (2026-03-01) must not be before from (2026-03-31)'],
      });
      expect(res.body).not.toHaveProperty('orgId');
    },
  );
});

describe('GET /api/stats/* organisation filter (integration)', () => {
  function getAsAdmin(
    path: 'summary' | 'metrics',
    admin: { cognitoSub: string },
    query: Record<string, string>,
  ) {
    return request(harness.server)
      .get(`/api/stats/${path}`)
      .query(query)
      .set(authHeaders(admin, 'admin'));
  }

  // A donor with two available lots and one collected, and an outside donor with its own collected lot.
  async function seedTwoDonors(collectedAt?: { donor: Date; other: Date }) {
    const donor = await seedDonor();
    const otherDonor = await seedDonor();
    const rescue = await seedRescuePartner();

    const collected = async (
      owner: typeof donor,
      quantity: string,
      at?: Date,
    ) => {
      const listing = await seedListing({
        donorOrgId: owner.org.id,
        createdBy: owner.user.id,
        status: 'collected',
        unit: 'kg',
        quantity,
      });
      await seedRequest({
        listingId: listing.id,
        rescueOrgId: rescue.org.id,
        claimedBy: rescue.user.id,
        status: 'completed',
        collectedQuantity: quantity,
        collectedAt: at,
      });
    };

    for (let i = 0; i < 2; i++) {
      await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: 'available',
      });
    }
    await collected(donor, '5.00', collectedAt?.donor);
    await collected(otherDonor, '7.00', collectedAt?.other);

    return { donor, otherDonor, rescue };
  }

  it('reports an admin on the organisation they name, and no other', async () => {
    const { donor } = await seedTwoDonors();
    const admin = await seedUser({ orgId: null, isAdmin: true });

    const summary = await getAsAdmin('summary', admin, {
      orgId: donor.org.id,
    }).expect(200);
    expect(body<OrgSummaryBody>(summary)).toMatchObject({
      orgId: donor.org.id,
      listings: { available: 2, collected: 1, total: 3 },
      claims: { completed: 1, total: 1 },
    });

    const metrics = await getAsAdmin('metrics', admin, {
      orgId: donor.org.id,
    }).expect(200);
    expect(body<RescuedMetricsBody>(metrics)).toMatchObject({
      orgId: donor.org.id,
      rescuedByUnit: [{ unit: 'kg', amount: 5, lots: 1 }],
      claimsCompleted: 1,
    });
  });

  it('applies the period to the named organisation', async () => {
    const march = new Date('2026-03-15T12:00:00+08:00');
    const may = new Date('2026-05-15T12:00:00+08:00');
    const { donor } = await seedTwoDonors({ donor: march, other: march });
    const rescue = await seedRescuePartner();
    const late = await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'collected',
      unit: 'kg',
    });
    await seedRequest({
      listingId: late.id,
      rescueOrgId: rescue.org.id,
      claimedBy: rescue.user.id,
      status: 'completed',
      collectedQuantity: '3.00',
      collectedAt: may,
    });
    const admin = await seedUser({ orgId: null, isAdmin: true });

    const res = await getAsAdmin('metrics', admin, {
      orgId: donor.org.id,
      from: '2026-03-01',
      to: '2026-03-31',
    }).expect(200);

    expect(body<RescuedMetricsBody>(res)).toMatchObject({
      orgId: donor.org.id,
      rescuedByUnit: [{ unit: 'kg', amount: 5, lots: 1 }],
      claimsCompleted: 1,
    });
  });

  it.each(['summary', 'metrics'] as const)(
    'returns 404 on %s for an organisation that does not exist',
    async (path) => {
      const admin = await seedUser({ orgId: null, isAdmin: true });

      const res = await getAsAdmin(path, admin, {
        orgId: randomUUID(),
      }).expect(404);

      expect(res.body).not.toHaveProperty('orgId');
    },
  );

  it('rejects an organisation id that is not a UUID', async () => {
    const admin = await seedUser({ orgId: null, isAdmin: true });

    await getAsAdmin('summary', admin, { orgId: 'not-a-uuid' }).expect(400);
  });

  it.each(['summary', 'metrics'] as const)(
    'requires an admin to name an organisation on %s',
    async (path) => {
      const admin = await seedUser({ orgId: null, isAdmin: true });

      const res = await getAsAdmin(path, admin, {}).expect(400);

      expect(res.body).toMatchObject({
        message: 'orgId is required for administrators',
      });
      expect(res.body).not.toHaveProperty('orgId');
    },
  );
});

describe('GET /api/stats/* organisation filter for non-admins (integration)', () => {
  function getWithOrg(
    path: 'summary' | 'metrics',
    user: { cognitoSub: string },
    orgId: string,
  ) {
    return request(harness.server)
      .get(`/api/stats/${path}`)
      .query({ orgId })
      .set(authHeaders(user));
  }

  it.each(['summary', 'metrics'] as const)(
    "denies a member another organisation's %s, returning no figures",
    async (path) => {
      const donor = await seedDonor();
      const otherDonor = await seedDonor();
      const rescue = await seedRescuePartner();
      const listing = await seedListing({
        donorOrgId: otherDonor.org.id,
        createdBy: otherDonor.user.id,
        status: 'collected',
      });
      await seedRequest({
        listingId: listing.id,
        rescueOrgId: rescue.org.id,
        claimedBy: rescue.user.id,
        status: 'completed',
      });

      const res = await getWithOrg(path, donor.user, otherDonor.org.id).expect(
        403,
      );

      expect(res.body).toMatchObject({
        message: "you can only view your own organisation's statistics",
      });
      expect(res.body).not.toHaveProperty('orgId');
      expect(res.body).not.toHaveProperty('listings');
      expect(res.body).not.toHaveProperty('rescuedByUnit');
    },
  );

  it('denies an organisation that does not exist the same way, so ids cannot be probed', async () => {
    const donor = await seedDonor();

    const res = await getWithOrg('summary', donor.user, randomUUID()).expect(
      403,
    );

    expect(res.body).toMatchObject({
      message: "you can only view your own organisation's statistics",
    });
  });

  it('accepts a member naming their own organisation', async () => {
    const donor = await seedDonor();
    await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'available',
    });

    const res = await getWithOrg('summary', donor.user, donor.org.id).expect(
      200,
    );

    expect(body<OrgSummaryBody>(res)).toMatchObject({
      orgId: donor.org.id,
      listings: { available: 1, total: 1 },
    });
  });
});
