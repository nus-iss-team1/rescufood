import type { AuditRepository } from '../audit/audit.repository';
import type { Database } from '../db/db.module';
import { ListingExpiryService } from './listing-expiry.service';
import { ListingsRepository } from './listings.repository';

function makeRepository() {
  return {
    expireOverdue: jest.fn(),
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
  it('audits each expired listing and claim and logs the counts', async () => {
    const repository = makeRepository();
    repository.expireOverdue.mockResolvedValue({
      listingIds: ['l1', 'l2', 'l3'],
      claimIds: ['c1', 'c2'],
    });
    const { service, audit, logger } = make(repository);

    await service.sweepExpiredListings();

    expect(repository.findExpiredListingTargets).toHaveBeenCalledWith([
      'l1',
      'l2',
      'l3',
    ]);
    expect(repository.findExpiredClaimTargets).toHaveBeenCalledWith([
      'c1',
      'c2',
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
      { expiredListings: 3, expiredClaims: 2 },
      'expired overdue listings',
    );
  });

  it('notifies each expired listing donor and stranded claimant', async () => {
    const repository = makeRepository();
    repository.expireOverdue.mockResolvedValue({
      listingIds: ['l1'],
      claimIds: ['c1'],
    });
    repository.findExpiredListingTargets.mockResolvedValue([
      {
        id: 'l1',
        description: 'Milk',
        donorName: 'Priya Nair',
        donorEmail: 'donor@x.com',
      },
    ]);
    repository.findExpiredClaimTargets.mockResolvedValue([
      {
        listingDescription: 'Milk',
        rescueName: 'Alex Tan',
        rescueEmail: 'rescue@x.com',
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
    );
    expect(notifications.listingExpired).toHaveBeenCalledWith(
      'rescue@x.com',
      expect.objectContaining({ recipientName: 'Alex Tan', wasClaimed: true }),
    );
  });

  it('does not log or audit when nothing was overdue', async () => {
    const repository = makeRepository();
    repository.expireOverdue.mockResolvedValue({
      listingIds: [],
      claimIds: [],
    });
    const { service, audit, logger } = make(repository);

    await service.sweepExpiredListings();

    expect(audit.record).not.toHaveBeenCalled();
    expect(logger.log).not.toHaveBeenCalled();
  });
});
