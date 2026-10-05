import request from 'supertest';
import {
  closeTestPool,
  countAuditActions,
  getListingRow,
  resetDb,
  seedDonor,
  seedListing,
  seedRequest,
  seedRescuePartner,
  testPool,
  type SeededOrg,
  type SeededUser,
} from './support/db';
import { authHeaders, body, createTestApp, type TestApp } from './support/app';

interface ClaimBody {
  id: string;
  status: string;
  cancelledAt: string | null;
  cancellationReason: string;
  cancelledBy: string | null;
  cancelledByOrgId: string | null;
  listingRelisted: boolean;
  relistBlockedReason: string | null;
}

interface CancellationRow {
  status: string;
  cancelled_at: Date | null;
  cancellation_reason: string;
  cancelled_by: string | null;
  cancelled_by_org_id: string | null;
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

async function getCancellationRow(id: string): Promise<CancellationRow> {
  const { rows } = await testPool().query<CancellationRow>(
    `SELECT status, cancelled_at, cancellation_reason, cancelled_by, cancelled_by_org_id
       FROM requests WHERE id = $1`,
    [id],
  );
  return rows[0];
}

const HOUR = 60 * 60 * 1000;
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * HOUR);

// A reserved listing with an active claim held by a rescue partner; by
// default its window opens well before the 3h cancellation cutoff.
async function seedActiveClaim(
  window: { startHours: number; endHours: number } = {
    startHours: 5,
    endHours: 9,
  },
): Promise<{
  donor: { org: SeededOrg; user: SeededUser };
  rescue: { org: SeededOrg; user: SeededUser };
  listingId: string;
  claimId: string;
}> {
  const donor = await seedDonor();
  const rescue = await seedRescuePartner();
  const listing = await seedListing({
    donorOrgId: donor.org.id,
    createdBy: donor.user.id,
    status: 'reserved',
    pickupWindowStart: hoursFromNow(window.startHours),
    pickupWindowEnd: hoursFromNow(window.endHours),
  });
  const claim = await seedRequest({
    listingId: listing.id,
    rescueOrgId: rescue.org.id,
    claimedBy: rescue.user.id,
  });
  return { donor, rescue, listingId: listing.id, claimId: claim.id };
}

function cancel(user: SeededUser, claimId: string, reason?: string) {
  return request(harness.server)
    .patch(`/api/requests/${claimId}`)
    .set(authHeaders(user))
    .send({
      status: 'cancelled',
      ...(reason !== undefined && { cancellationReason: reason }),
    });
}

describe('Claim cancellation HTTP (integration)', () => {
  it('cancels the claim, records who cancelled it and relists the listing', async () => {
    const { rescue, listingId, claimId } = await seedActiveClaim();

    const res = await cancel(rescue.user, claimId, '  Van broke down  ').expect(
      200,
    );

    expect(body<ClaimBody>(res)).toMatchObject({
      status: 'cancelled',
      cancellationReason: 'Van broke down',
      cancelledBy: rescue.user.id,
      cancelledByOrgId: rescue.org.id,
      listingRelisted: true,
      relistBlockedReason: null,
    });
    const row = await getCancellationRow(claimId);
    expect(row).toMatchObject({
      status: 'cancelled',
      cancellation_reason: 'Van broke down',
      cancelled_by: rescue.user.id,
      cancelled_by_org_id: rescue.org.id,
    });
    expect(row.cancelled_at).toBeInstanceOf(Date);
    expect(await getListingRow(listingId)).toMatchObject({
      status: 'available',
      version: 2,
    });
  });

  it('cancels the claim but expires the listing past the cutoff', async () => {
    const { rescue, listingId, claimId } = await seedActiveClaim({
      startHours: 2,
      endHours: 6,
    });

    const res = await cancel(rescue.user, claimId, 'Van broke down').expect(
      200,
    );

    expect(body<ClaimBody>(res)).toMatchObject({
      status: 'cancelled',
      cancelledBy: rescue.user.id,
      listingRelisted: false,
      relistBlockedReason: 'past_cutoff',
    });
    expect((await getCancellationRow(claimId)).status).toBe('cancelled');
    expect(await getListingRow(listingId)).toMatchObject({
      status: 'expired',
      version: 2,
    });
    expect(await countAuditActions('listing.expired', listingId)).toBe(1);
  });

  it('does not relist once the pickup window is open', async () => {
    const { donor, listingId, claimId } = await seedActiveClaim({
      startHours: -1,
      endHours: 3,
    });

    const res = await cancel(donor.user, claimId, 'Stock spoiled').expect(200);

    expect(body<ClaimBody>(res)).toMatchObject({
      listingRelisted: false,
      relistBlockedReason: 'past_cutoff',
    });
    expect((await getListingRow(listingId))?.status).toBe('expired');
  });

  it('returns the cancellation history on a later read', async () => {
    const { rescue, claimId } = await seedActiveClaim();
    await cancel(rescue.user, claimId, 'Van broke down').expect(200);

    const res = await request(harness.server)
      .get(`/api/requests/${claimId}`)
      .set(authHeaders(rescue.user))
      .expect(200);

    const claim = body<ClaimBody>(res);
    expect(claim).toMatchObject({
      cancellationReason: 'Van broke down',
      cancelledBy: rescue.user.id,
      cancelledByOrgId: rescue.org.id,
    });
    expect(claim.cancelledAt).not.toBeNull();
  });

  it('lets the donor cancel, recording the donor as the actor', async () => {
    const { donor, listingId, claimId } = await seedActiveClaim();

    await cancel(donor.user, claimId, 'Stock spoiled').expect(200);

    expect(await getCancellationRow(claimId)).toMatchObject({
      status: 'cancelled',
      cancelled_by: donor.user.id,
      cancelled_by_org_id: donor.org.id,
    });
    expect((await getListingRow(listingId))?.status).toBe('available');
  });

  it.each([
    ['missing', undefined],
    ['blank', '   '],
  ])(
    'rejects a cancellation whose reason is %s, changing nothing',
    async (_label, reason) => {
      const { rescue, donor, listingId, claimId } = await seedActiveClaim();

      await cancel(rescue.user, claimId, reason).expect(400);
      await cancel(donor.user, claimId, reason).expect(400);

      expect((await getCancellationRow(claimId)).status).toBe('active');
      expect(await getListingRow(listingId)).toMatchObject({
        status: 'reserved',
        version: 1,
      });
    },
  );

  it('denies another organisation, changing neither claim nor listing', async () => {
    const { listingId, claimId } = await seedActiveClaim();
    const outsider = await seedRescuePartner();

    await cancel(outsider.user, claimId, 'Not mine').expect(403);

    expect((await getCancellationRow(claimId)).status).toBe('active');
    expect(await getListingRow(listingId)).toMatchObject({
      status: 'reserved',
      version: 1,
    });
    expect(await countAuditActions('claim.cancelled', claimId)).toBe(0);
  });

  it('rejects cancelling a claim that is no longer active', async () => {
    const donor = await seedDonor();
    const rescue = await seedRescuePartner();
    const listing = await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'collected',
    });
    const claim = await seedRequest({
      listingId: listing.id,
      rescueOrgId: rescue.org.id,
      claimedBy: rescue.user.id,
      status: 'completed',
    });

    await cancel(rescue.user, claim.id, 'Too late').expect(400);

    expect((await getCancellationRow(claim.id)).status).toBe('completed');
    expect(await getListingRow(listing.id)).toMatchObject({
      status: 'collected',
      version: 1,
    });
  });

  it('rejects a retry of a cancellation that already succeeded', async () => {
    const { rescue, listingId, claimId } = await seedActiveClaim();

    await cancel(rescue.user, claimId, 'Van broke down').expect(200);
    await cancel(rescue.user, claimId, 'Van broke down').expect(400);

    expect(await countAuditActions('claim.cancelled', claimId)).toBe(1);
    expect((await getListingRow(listingId))?.version).toBe(2);
  });

  it('cancels at most once under concurrent requests from both parties', async () => {
    const { rescue, donor, listingId, claimId } = await seedActiveClaim();

    const responses = await Promise.all([
      cancel(rescue.user, claimId, 'Van broke down'),
      cancel(donor.user, claimId, 'Stock spoiled'),
      cancel(rescue.user, claimId, 'Van broke down'),
      cancel(donor.user, claimId, 'Stock spoiled'),
    ]);

    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    // Losers either read the claim already cancelled (400) or lost the CAS (409).
    expect(
      statuses.filter((s) => s !== 200).every((s) => [400, 409].includes(s)),
    ).toBe(true);
    expect(await countAuditActions('claim.cancelled', claimId)).toBe(1);
    expect(await getListingRow(listingId)).toMatchObject({
      status: 'available',
      version: 2,
    });
  });

  it('expires the listing at most once under concurrent late cancellations', async () => {
    const { rescue, donor, listingId, claimId } = await seedActiveClaim({
      startHours: 1,
      endHours: 4,
    });

    const responses = await Promise.all([
      cancel(rescue.user, claimId, 'Van broke down'),
      cancel(donor.user, claimId, 'Stock spoiled'),
      cancel(rescue.user, claimId, 'Van broke down'),
    ]);

    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await countAuditActions('claim.cancelled', claimId)).toBe(1);
    expect(await countAuditActions('listing.expired', listingId)).toBe(1);
    expect(await getListingRow(listingId)).toMatchObject({
      status: 'expired',
      version: 2,
    });
  });
});
