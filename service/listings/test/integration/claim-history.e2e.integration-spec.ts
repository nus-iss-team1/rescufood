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
  type SeededUser,
} from './support/db';
import { authHeaders, body, createTestApp, type TestApp } from './support/app';

interface ClaimBody {
  id: string;
  listingId: string;
  rescueOrgId: string;
  status: string;
  requestedAt: string;
  cancelledAt: string | null;
  collectedAt: string | null;
  noShowAt: string | null;
  createdAt: string;
  updatedAt: string;
  listingDescription: string | null;
  listingUnit: string | null;
  listingCategory: string | null;
}

interface ClaimPage {
  items: ClaimBody[];
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

const HOUR = 60 * 60 * 1000;
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * HOUR);

function listClaims(
  user: Pick<SeededUser, 'cognitoSub'>,
  role: 'user' | 'admin' = 'user',
) {
  return request(harness.server)
    .get('/api/requests')
    .set(authHeaders(user, role));
}

function getClaim(user: Pick<SeededUser, 'cognitoSub'>, id: string) {
  return request(harness.server)
    .get(`/api/requests/${id}`)
    .set(authHeaders(user));
}

// A reserved listing from a fresh donor, claimed by the given rescue org.
async function seedClaimFor(
  rescue: { org: SeededOrg; user: SeededUser },
  status: 'active' | 'completed' | 'cancelled' = 'active',
) {
  const donor = await seedDonor();
  const listing = await seedListing({
    donorOrgId: donor.org.id,
    createdBy: donor.user.id,
    status: status === 'active' ? 'reserved' : 'collected',
    pickupWindowStart: hoursFromNow(5),
    pickupWindowEnd: hoursFromNow(9),
  });
  const claim = await seedRequest({
    listingId: listing.id,
    rescueOrgId: rescue.org.id,
    claimedBy: rescue.user.id,
    status,
  });
  return { donor, listingId: listing.id, claimId: claim.id };
}

describe('Claim history (integration)', () => {
  it("returns the org's claims with listing reference, status and timestamps", async () => {
    const rescue = await seedRescuePartner();
    const active = await seedClaimFor(rescue, 'active');
    const completed = await seedClaimFor(rescue, 'completed');

    const page = body<ClaimPage>(await listClaims(rescue.user).expect(200));

    expect(page.total).toBe(2);
    expect(page.items.map((c) => c.id).sort()).toEqual(
      [active.claimId, completed.claimId].sort(),
    );
    const claim = page.items.find((c) => c.id === active.claimId)!;
    expect(claim).toMatchObject({
      listingId: active.listingId,
      rescueOrgId: rescue.org.id,
      status: 'active',
      listingDescription: 'A tray of day-old sourdough',
      listingUnit: 'loaves',
      listingCategory: 'bakery',
      cancelledAt: null,
      collectedAt: null,
      noShowAt: null,
    });
    for (const field of ['requestedAt', 'createdAt', 'updatedAt'] as const) {
      expect(Number.isNaN(Date.parse(claim[field]))).toBe(false);
    }
  });

  it('is shared across members of the org, not just the claimant', async () => {
    const rescue = await seedRescuePartner();
    const colleague = await seedUser({ orgId: rescue.org.id });
    const { claimId } = await seedClaimFor(rescue);

    const page = body<ClaimPage>(await listClaims(colleague).expect(200));

    expect(page.items.map((c) => c.id)).toEqual([claimId]);
  });

  it('excludes claims belonging to another organisation', async () => {
    const mine = await seedRescuePartner();
    const theirs = await seedRescuePartner();
    const own = await seedClaimFor(mine);
    const other = await seedClaimFor(theirs);

    const page = body<ClaimPage>(await listClaims(mine.user).expect(200));

    expect(page.total).toBe(1);
    expect(page.items.map((c) => c.id)).toEqual([own.claimId]);
    await getClaim(mine.user, other.claimId).expect(404);
  });

  it('returns a successful empty result when the org has no claims', async () => {
    const rescue = await seedRescuePartner();
    await seedClaimFor(await seedRescuePartner());

    const page = body<ClaimPage>(await listClaims(rescue.user).expect(200));

    expect(page).toEqual({ items: [], total: 0 });
  });

  it('reflects a committed status change on the next request', async () => {
    const rescue = await seedRescuePartner();
    const { claimId } = await seedClaimFor(rescue);
    const before = body<ClaimPage>(await listClaims(rescue.user).expect(200));
    expect(before.items[0]).toMatchObject({ id: claimId, status: 'active' });

    await request(harness.server)
      .patch(`/api/requests/${claimId}`)
      .set(authHeaders(rescue.user))
      .send({ status: 'cancelled', cancellationReason: 'Van broke down' })
      .expect(200);

    const after = body<ClaimPage>(await listClaims(rescue.user).expect(200));
    expect(after.items[0]).toMatchObject({ id: claimId, status: 'cancelled' });
    expect(after.items[0].cancelledAt).not.toBeNull();
  });

  it('shows the donor the claims on its own listings', async () => {
    const rescue = await seedRescuePartner();
    const { donor, claimId } = await seedClaimFor(rescue);
    await seedClaimFor(rescue);

    const page = body<ClaimPage>(await listClaims(donor.user).expect(200));

    expect(page.items.map((c) => c.id)).toEqual([claimId]);
  });

  it('shows an admin every claim', async () => {
    const admin = await seedUser({ orgId: null, isAdmin: true });
    const first = await seedClaimFor(await seedRescuePartner());
    const second = await seedClaimFor(await seedRescuePartner());

    const page = body<ClaimPage>(await listClaims(admin, 'admin').expect(200));

    expect(page.items.map((c) => c.id).sort()).toEqual(
      [first.claimId, second.claimId].sort(),
    );
  });

  it('rejects a caller with no credentials', async () => {
    await request(harness.server).get('/api/requests').expect(401);
  });

  it('denies a caller with no organisation, returning no claim records', async () => {
    const orgless = await seedUser({ orgId: null });

    const res = await listClaims(orgless).expect(403);

    expect(res.body).not.toHaveProperty('items');
  });

  it.each<[string, SeededOrg['status'], string]>([
    ['a suspended account', 'approved', 'suspended'],
    ['a pending org', 'pending', 'active'],
    ['a rejected org', 'rejected', 'active'],
    ['a suspended org', 'suspended', 'active'],
  ])(
    'denies a caller with %s, returning none of its claims',
    async (_, orgStatus, userStatus) => {
      const org = await seedOrg({ type: 'rescue_partner', status: orgStatus });
      const user = await seedUser({ orgId: org.id, status: userStatus });
      const { claimId } = await seedClaimFor({ org, user });

      const list = await listClaims(user).expect(403);
      expect(list.body).not.toHaveProperty('items');

      const one = await getClaim(user, claimId).expect(403);
      expect(one.body).not.toHaveProperty('listingId');
    },
  );
});
