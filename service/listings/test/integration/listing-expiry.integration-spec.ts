import type { AuditRepository } from '../../src/audit/audit.repository';
import { ListingExpiryService } from '../../src/listings/listing-expiry.service';
import {
  closeTestPool,
  countAuditActions,
  getListingRow,
  getRequestRow,
  resetDb,
  seedDonor,
  seedListing,
  seedRequest,
  seedRescuePartner,
  type SeededListing,
} from './support/db';
import { createRepoContext, type RepoContext } from './support/repos';

const HOUR = 60 * 60 * 1000;
const pastWindow = () => ({
  pickupWindowStart: new Date(Date.now() - 3 * HOUR),
  pickupWindowEnd: new Date(Date.now() - HOUR),
});

let ctx: RepoContext;

beforeAll(async () => {
  ctx = await createRepoContext();
});

afterAll(async () => {
  await ctx.close();
  await closeTestPool();
});

beforeEach(resetDb);

function makeService(audit: Pick<AuditRepository, 'record'> = ctx.audit) {
  const notifications = {
    listingExpired: jest.fn().mockResolvedValue(undefined),
  };
  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const service = new ListingExpiryService(
    ctx.listings,
    audit as AuditRepository,
    notifications as never,
    ctx.db,
    logger as never,
  );
  return { service, notifications, logger };
}

async function seedAs(
  status: SeededListing['status'],
  window: Partial<ReturnType<typeof pastWindow>> = pastWindow(),
) {
  const { org, user } = await seedDonor();
  return seedListing({
    donorOrgId: org.id,
    createdBy: user.id,
    status,
    ...window,
  });
}

describe('ListingExpiryService (integration)', () => {
  it('expires an available listing whose pickup window has passed', async () => {
    const overdue = await seedAs('available');
    const { service } = makeService();

    await service.sweepExpiredListings();

    expect((await getListingRow(overdue.id))?.status).toBe('expired');
    expect(await countAuditActions('listing.expired', overdue.id)).toBe(1);
  });

  it('leaves not-yet-due, cancelled and collected listings unchanged', async () => {
    const future = await seedAs('available', {});
    const cancelled = await seedAs('cancelled');
    const collected = await seedAs('collected');
    const { service } = makeService();

    await service.sweepExpiredListings();

    expect((await getListingRow(future.id))?.status).toBe('available');
    expect((await getListingRow(cancelled.id))?.status).toBe('cancelled');
    expect((await getListingRow(collected.id))?.status).toBe('collected');
  });

  it('creates no duplicate transition, audit or notification when run twice', async () => {
    const donor = await seedDonor();
    const rescue = await seedRescuePartner();
    const overdue = await seedListing({
      donorOrgId: donor.org.id,
      createdBy: donor.user.id,
      status: 'reserved',
      ...pastWindow(),
    });
    const claim = await seedRequest({
      listingId: overdue.id,
      rescueOrgId: rescue.org.id,
      claimedBy: rescue.user.id,
    });
    const { service, notifications } = makeService();

    await service.sweepExpiredListings();
    await service.sweepExpiredListings();

    expect(await getListingRow(overdue.id)).toMatchObject({
      status: 'expired',
      version: 2,
    });
    expect((await getRequestRow(claim.id))?.status).toBe('expired');
    expect(await countAuditActions('listing.expired', overdue.id)).toBe(1);
    expect(await countAuditActions('claim.expired', claim.id)).toBe(1);
    // One donor + one claimant, from the first run only.
    expect(notifications.listingExpired).toHaveBeenCalledTimes(2);
  });

  it('rolls back a failing listing, logs it and still expires the others', async () => {
    const good = await seedAs('available');
    const bad = await seedAs('available');
    const audit = {
      record: (...args: Parameters<AuditRepository['record']>) =>
        args[0].entityId === bad.id
          ? Promise.reject(new Error('audit write failed'))
          : ctx.audit.record(...args),
    };
    const { service, logger } = makeService(audit);

    await service.sweepExpiredListings();

    expect((await getListingRow(good.id))?.status).toBe('expired');
    expect((await getListingRow(bad.id))?.status).toBe('available');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ listingId: bad.id }),
      'failed to expire listing',
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({ expiredListings: 1, failedListings: 1 }),
      'expired overdue listings',
    );
  });
});
