import type { AuditRepository } from '../audit/audit.repository';
import type { Database } from '../db/db.module';
import { ListingExpiryService } from './listing-expiry.service';
import { ListingsRepository } from './listings.repository';

function makeRepository() {
  return {
    findOverdueListingIds: jest.fn().mockResolvedValue([]),
    expireListing: jest.fn(),
    findExpiredListingTargets: jest.fn().mockResolvedValue([]),
    findExpiredClaimTargets: jest.fn().mockResolvedValue([]),
  };
}

function makeAudit() {
  return { record: jest.fn().mockResolvedValue(undefined) };
}

function makeNotifications() {
  return {
    claimCreated: jest.fn().mockResolvedValue(undefined),
    claimEnded: jest.fn().mockResolvedValue(undefined),
    pickupCompleted: jest.fn().mockResolvedValue(undefined),
    listingExpired: jest.fn().mockResolvedValue(undefined),
  };
}

function makeDb() {
  return {
    transaction: jest.fn((cb: (tx: unknown) => unknown) => cb('tx')),
  };
}

function makeLogger() {
  return { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

function make(repository: ReturnType<typeof makeRepository>) {
  const audit = makeAudit();
  const notifications = makeNotifications();
  const db = makeDb();
  const logger = makeLogger();
  const service = new ListingExpiryService(
    repository as unknown as ListingsRepository,
    audit as unknown as AuditRepository,
    notifications as never,
    db as unknown as Database,
    logger as never,
  );
  return { service, audit, notifications, db, logger };
}

describe('ListingExpiryService', () => {
  it('expires each overdue listing in its own transaction, audits it and logs the counts', async () => {
    const repository = makeRepository();
    repository.findOverdueListingIds.mockResolvedValue(['l1', 'l2', 'l3']);
    repository.expireListing
      .mockResolvedValueOnce({ claimId: 'c1' })
      .mockResolvedValueOnce({ claimId: undefined })
      .mockResolvedValueOnce({ claimId: 'c3' });
    const { service, audit, db, logger } = make(repository);

    await service.sweepExpiredListings();

    expect(db.transaction).toHaveBeenCalledTimes(3);
    expect(repository.expireListing).toHaveBeenCalledWith(
      'l1',
      expect.any(Date),
      'tx',
    );
    expect(repository.findExpiredListingTargets).toHaveBeenCalledWith([
      'l1',
      'l2',
      'l3',
    ]);
    expect(repository.findExpiredClaimTargets).toHaveBeenCalledWith([
      'c1',
      'c3',
    ]);
    expect(audit.record).toHaveBeenCalledTimes(5);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'listing.expired',
        entityType: 'listing',
        entityId: 'l1',
      }),
      'tx',
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'claim.expired',
        entityType: 'claim',
        entityId: 'c1',
      }),
      'tx',
    );
    expect(logger.log).toHaveBeenCalledWith(
      { expiredListings: 3, expiredClaims: 2, failedListings: 0 },
      'expired overdue listings',
    );
  });

  it('skips a listing that is no longer overdue without auditing or notifying it', async () => {
    const repository = makeRepository();
    repository.findOverdueListingIds.mockResolvedValue(['l1']);
    repository.expireListing.mockResolvedValue(undefined);
    const { service, audit, notifications, logger } = make(repository);

    await service.sweepExpiredListings();

    expect(audit.record).not.toHaveBeenCalled();
    expect(notifications.listingExpired).not.toHaveBeenCalled();
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('logs a failing listing and still expires the others', async () => {
    const repository = makeRepository();
    repository.findOverdueListingIds.mockResolvedValue(['l1', 'l2', 'l3']);
    const boom = new Error('constraint violated');
    repository.expireListing
      .mockResolvedValueOnce({ claimId: undefined })
      .mockRejectedValueOnce(boom)
      .mockResolvedValueOnce({ claimId: undefined });
    const { service, logger } = make(repository);

    await expect(service.sweepExpiredListings()).resolves.toBeUndefined();

    expect(repository.expireListing).toHaveBeenCalledTimes(3);
    expect(logger.error).toHaveBeenCalledWith(
      { err: boom, listingId: 'l2' },
      'failed to expire listing',
    );
    expect(logger.log).toHaveBeenCalledWith(
      { expiredListings: 2, expiredClaims: 0, failedListings: 1 },
      'expired overdue listings',
    );
    expect(repository.findExpiredListingTargets).toHaveBeenCalledWith([
      'l1',
      'l3',
    ]);
  });

  it('logs and stops when the overdue lookup fails', async () => {
    const repository = makeRepository();
    const boom = new Error('connection refused');
    repository.findOverdueListingIds.mockRejectedValue(boom);
    const { service, logger } = make(repository);

    await expect(service.sweepExpiredListings()).resolves.toBeUndefined();

    expect(repository.expireListing).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      { err: boom },
      'listing expiry sweep failed',
    );
  });

  it('notifies each expired listing donor and stranded claimant', async () => {
    const repository = makeRepository();
    repository.findOverdueListingIds.mockResolvedValue(['l1']);
    repository.expireListing.mockResolvedValue({ claimId: 'c1' });
    repository.findExpiredListingTargets.mockResolvedValue([
      {
        id: 'l1',
        description: 'Milk',
        donorName: 'Priya Nair',
        donorEmail: 'donor@x.com',
        donorSub: 'sub-donor',
      },
    ]);
    repository.findExpiredClaimTargets.mockResolvedValue([
      {
        listingId: 'l1',
        listingDescription: 'Milk',
        rescueName: 'Alex Tan',
        rescueEmail: 'rescue@x.com',
        rescueSub: 'sub-rescue',
      },
    ]);
    const { service, notifications } = make(repository);

    await service.sweepExpiredListings();

    expect(notifications.listingExpired).toHaveBeenCalledWith(
      'donor@x.com',
      expect.objectContaining({
        recipientName: 'Priya Nair',
        listingDescription: 'Milk',
        wasClaimed: true,
      }),
      { eventId: 'listing:l1:expired', recipientUserId: 'sub-donor' },
    );
    expect(notifications.listingExpired).toHaveBeenCalledWith(
      'rescue@x.com',
      expect.objectContaining({ recipientName: 'Alex Tan', wasClaimed: true }),
      { eventId: 'listing:l1:expired', recipientUserId: 'sub-rescue' },
    );
  });

  it('tells each donor whether their own listing was claimed', async () => {
    const repository = makeRepository();
    repository.findOverdueListingIds.mockResolvedValue(['l1', 'l2']);
    repository.expireListing
      .mockResolvedValueOnce({ claimId: 'c1' })
      .mockResolvedValueOnce({ claimId: undefined });
    repository.findExpiredListingTargets.mockResolvedValue([
      {
        id: 'l1',
        description: 'Milk',
        donorName: 'Priya Nair',
        donorEmail: 'claimed@x.com',
        donorSub: 'sub-1',
      },
      {
        id: 'l2',
        description: 'Bread',
        donorName: 'Wei Ling',
        donorEmail: 'unclaimed@x.com',
        donorSub: 'sub-2',
      },
    ]);
    const { service, notifications } = make(repository);

    await service.sweepExpiredListings();

    expect(notifications.listingExpired).toHaveBeenCalledWith(
      'claimed@x.com',
      expect.objectContaining({ wasClaimed: true }),
      expect.anything(),
    );
    expect(notifications.listingExpired).toHaveBeenCalledWith(
      'unclaimed@x.com',
      expect.objectContaining({ wasClaimed: false }),
      expect.anything(),
    );
  });

  it('does not log or audit when nothing was overdue', async () => {
    const repository = makeRepository();
    const { service, audit, db, logger } = make(repository);

    await service.sweepExpiredListings();

    expect(db.transaction).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(logger.log).not.toHaveBeenCalled();
  });
});
