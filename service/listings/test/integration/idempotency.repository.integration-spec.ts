import { randomUUID } from 'node:crypto';
import {
  closeTestPool,
  resetDb,
  seedDonor,
  seedListing,
  seedRescuePartner,
  testPool,
} from './support/db';
import { createRepoContext, type RepoContext } from './support/repos';

let ctx: RepoContext;

beforeAll(async () => {
  ctx = await createRepoContext();
});

afterAll(async () => {
  await ctx.close();
  await closeTestPool();
});

beforeEach(resetDb);

const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);

describe('IdempotencyRepository (integration)', () => {
  it('claims a slot once per (org, key)', async () => {
    const { org } = await seedRescuePartner();
    const key = randomUUID();

    const first = await ctx.idempotency.claimSlot({
      rescueOrgId: org.id,
      idempotencyKey: key,
      requestFingerprint: 'fp-1',
      expiresAt: inAnHour(),
    });
    expect(first?.status).toBe('pending');

    const second = await ctx.idempotency.claimSlot({
      rescueOrgId: org.id,
      idempotencyKey: key,
      requestFingerprint: 'fp-1',
      expiresAt: inAnHour(),
    });
    expect(second).toBeUndefined();

    const other = await seedRescuePartner();
    const forOther = await ctx.idempotency.claimSlot({
      rescueOrgId: other.org.id,
      idempotencyKey: key,
      requestFingerprint: 'fp-1',
      expiresAt: inAnHour(),
    });
    expect(forOther).toBeDefined();
  });

  it('completes a slot and pins it to the claim', async () => {
    const donor = await seedDonor();
    const rescue = await seedRescuePartner();
    const listing = await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
    });
    const { rows } = await testPool().query<{ id: string }>(
      `INSERT INTO requests (listing_id, rescue_org_id, claimed_by, status, requested_quantity)
       VALUES ($1, $2, $3, 'active', '10.00') RETURNING id`,
      [listing.id, rescue.org.id, rescue.user.id],
    );
    const claimId = rows[0].id;
    const key = randomUUID();

    const slot = await ctx.idempotency.claimSlot({
      rescueOrgId: rescue.org.id,
      idempotencyKey: key,
      requestFingerprint: 'fp',
      expiresAt: inAnHour(),
    });

    await ctx.idempotency.complete(slot!.id, claimId, { ok: true }, inAnHour());

    const found = await ctx.idempotency.find(rescue.org.id, key);
    expect(found).toMatchObject({ status: 'completed', claimId });
  });

  it('deleteExpired drops only past-expiry rows', async () => {
    const { org } = await seedRescuePartner();
    await ctx.idempotency.claimSlot({
      rescueOrgId: org.id,
      idempotencyKey: 'live',
      requestFingerprint: 'fp',
      expiresAt: inAnHour(),
    });
    await ctx.idempotency.claimSlot({
      rescueOrgId: org.id,
      idempotencyKey: 'stale',
      requestFingerprint: 'fp',
      expiresAt: new Date(Date.now() - 60 * 1000),
    });

    expect(await ctx.idempotency.deleteExpired(new Date())).toBe(1);
    expect(await ctx.idempotency.find(org.id, 'live')).toBeDefined();
    expect(await ctx.idempotency.find(org.id, 'stale')).toBeUndefined();
  });
});
