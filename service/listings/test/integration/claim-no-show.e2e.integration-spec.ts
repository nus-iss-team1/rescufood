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
import { hashPickupCode } from '../../src/requests/pickup/pickup-code.util';

interface ClaimBody {
  id: string;
  status: string;
  noShowAt: string | null;
  noShowReason: string;
  noShowBy: string | null;
  noShowByOrgId: string | null;
  listingRelisted: boolean;
}

interface NoShowRow {
  status: string;
  no_show_at: Date | null;
  no_show_reason: string;
  no_show_by: string | null;
  no_show_by_org_id: string | null;
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

async function getNoShowRow(id: string): Promise<NoShowRow> {
  const { rows } = await testPool().query<NoShowRow>(
    `SELECT status, no_show_at, no_show_reason, no_show_by, no_show_by_org_id
       FROM requests WHERE id = $1`,
    [id],
  );
  return rows[0];
}

const HOUR = 60 * 60 * 1000;
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * HOUR);

const CODE = '246813';

// A reserved listing with an active claim and a live pickup code; by default
// the pickup window is open.
async function seedActiveClaim(
  window: { startHours: number; endHours: number } = {
    startHours: -1,
    endHours: 3,
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
  await testPool().query(
    `UPDATE requests
        SET pickup_code_hash = $2,
            code_expires_at = now() + interval '1 hour',
            code_generated_by = $3,
            pickup_code_generated_at = now()
      WHERE id = $1`,
    [claim.id, hashPickupCode(CODE), rescue.user.id],
  );
  return { donor, rescue, listingId: listing.id, claimId: claim.id };
}

function reportNoShow(user: SeededUser, claimId: string, reason?: string) {
  return request(harness.server)
    .patch(`/api/requests/${claimId}`)
    .set(authHeaders(user))
    .send({
      status: 'no_show',
      ...(reason !== undefined && { noShowReason: reason }),
    });
}

describe('Claim no-show HTTP (integration)', () => {
  it('records the no-show with reporter, reason and time, and relists the listing', async () => {
    const { donor, listingId, claimId } = await seedActiveClaim();

    const res = await reportNoShow(
      donor.user,
      claimId,
      '  Nobody arrived  ',
    ).expect(200);

    expect(body<ClaimBody>(res)).toMatchObject({
      status: 'no_show',
      noShowReason: 'Nobody arrived',
      noShowBy: donor.user.id,
      noShowByOrgId: donor.org.id,
      listingRelisted: true,
    });
    const row = await getNoShowRow(claimId);
    expect(row).toMatchObject({
      status: 'no_show',
      no_show_reason: 'Nobody arrived',
      no_show_by: donor.user.id,
      no_show_by_org_id: donor.org.id,
    });
    expect(row.no_show_at).toBeInstanceOf(Date);
    expect(await getListingRow(listingId)).toMatchObject({
      status: 'available',
      version: 2,
    });
    expect(await countAuditActions('claim.no_show', claimId)).toBe(1);
  });

  it('lets the rescue partner report a no-show, recording them as the reporter', async () => {
    const { rescue, claimId } = await seedActiveClaim();

    await reportNoShow(rescue.user, claimId, 'Shop was closed').expect(200);

    expect(await getNoShowRow(claimId)).toMatchObject({
      status: 'no_show',
      no_show_by: rescue.user.id,
      no_show_by_org_id: rescue.org.id,
    });
  });

  it('allows a no-show after the pickup window has closed', async () => {
    const { donor, claimId } = await seedActiveClaim({
      startHours: -4,
      endHours: -1,
    });

    await reportNoShow(donor.user, claimId, 'Nobody arrived').expect(200);

    expect((await getNoShowRow(claimId)).status).toBe('no_show');
  });

  it('returns the no-show history on a later read', async () => {
    const { donor, rescue, claimId } = await seedActiveClaim();
    await reportNoShow(donor.user, claimId, 'Nobody arrived').expect(200);

    const res = await request(harness.server)
      .get(`/api/requests/${claimId}`)
      .set(authHeaders(rescue.user))
      .expect(200);

    const claim = body<ClaimBody>(res);
    expect(claim).toMatchObject({
      status: 'no_show',
      noShowReason: 'Nobody arrived',
      noShowBy: donor.user.id,
      noShowByOrgId: donor.org.id,
    });
    expect(claim.noShowAt).not.toBeNull();
  });

  it('rejects the pickup code once a no-show is recorded', async () => {
    const { donor, listingId, claimId } = await seedActiveClaim();
    await reportNoShow(donor.user, claimId, 'Nobody arrived').expect(200);

    await request(harness.server)
      .post(`/api/requests/${claimId}/verify`)
      .set(authHeaders(donor.user))
      .send({ code: CODE })
      .expect(400);
    await request(harness.server)
      .post('/api/requests/lookup-code')
      .set(authHeaders(donor.user))
      .send({ code: CODE })
      .expect(404);

    expect((await getNoShowRow(claimId)).status).toBe('no_show');
    expect((await getListingRow(listingId))?.status).toBe('available');
    expect(await countAuditActions('claim.completed', claimId)).toBe(0);
  });

  it.each([
    ['missing', undefined],
    ['blank', '   '],
  ])(
    'rejects a no-show whose reason is %s, changing nothing',
    async (_label, reason) => {
      const { rescue, donor, listingId, claimId } = await seedActiveClaim();

      await reportNoShow(rescue.user, claimId, reason).expect(400);
      await reportNoShow(donor.user, claimId, reason).expect(400);

      expect((await getNoShowRow(claimId)).status).toBe('active');
      expect(await getListingRow(listingId)).toMatchObject({
        status: 'reserved',
        version: 1,
      });
    },
  );

  it('rejects a no-show before the pickup window starts, changing nothing', async () => {
    const { donor, listingId, claimId } = await seedActiveClaim({
      startHours: 1,
      endHours: 4,
    });

    await reportNoShow(donor.user, claimId, 'Nobody arrived').expect(400);

    expect((await getNoShowRow(claimId)).status).toBe('active');
    expect(await getListingRow(listingId)).toMatchObject({
      status: 'reserved',
      version: 1,
    });
    expect(await countAuditActions('claim.no_show', claimId)).toBe(0);
  });

  it('denies another organisation, changing neither claim nor listing', async () => {
    const { listingId, claimId } = await seedActiveClaim();
    const outsider = await seedDonor();

    await reportNoShow(outsider.user, claimId, 'Not mine').expect(403);

    expect((await getNoShowRow(claimId)).status).toBe('active');
    expect(await getListingRow(listingId)).toMatchObject({
      status: 'reserved',
      version: 1,
    });
    expect(await countAuditActions('claim.no_show', claimId)).toBe(0);
  });

  it.each([
    ['cancelled', 'available'],
    ['completed', 'collected'],
    ['expired', 'expired'],
    ['no_show', 'available'],
  ] as const)(
    'rejects a no-show on a %s claim, changing nothing',
    async (claimStatus, listingStatus) => {
      const donor = await seedDonor();
      const rescue = await seedRescuePartner();
      const listing = await seedListing({
        donorOrgId: donor.org.id,
        createdBy: donor.user.id,
        status: listingStatus,
        pickupWindowStart: hoursFromNow(-1),
        pickupWindowEnd: hoursFromNow(3),
      });
      const claim = await seedRequest({
        listingId: listing.id,
        rescueOrgId: rescue.org.id,
        claimedBy: rescue.user.id,
        status: claimStatus,
      });

      await reportNoShow(donor.user, claim.id, 'Nobody arrived').expect(400);

      expect((await getNoShowRow(claim.id)).status).toBe(claimStatus);
      expect(await getListingRow(listing.id)).toMatchObject({
        status: listingStatus,
        version: 1,
      });
      expect(await countAuditActions('claim.no_show', claim.id)).toBe(0);
    },
  );

  it('records at most once under concurrent reports from both parties', async () => {
    const { rescue, donor, listingId, claimId } = await seedActiveClaim();

    const responses = await Promise.all([
      reportNoShow(donor.user, claimId, 'Nobody arrived'),
      reportNoShow(rescue.user, claimId, 'Shop was closed'),
      reportNoShow(donor.user, claimId, 'Nobody arrived'),
    ]);

    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(
      statuses.filter((s) => s !== 200).every((s) => [400, 409].includes(s)),
    ).toBe(true);
    expect(await countAuditActions('claim.no_show', claimId)).toBe(1);
    expect(await getListingRow(listingId)).toMatchObject({
      status: 'available',
      version: 2,
    });
  });
});
