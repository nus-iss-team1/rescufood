import type { AuditRepository } from '../audit/audit.repository';
import type { Database } from '../db/db.module';
import { ListingExpiryService } from './listing-expiry.service';
import { ListingsRepository } from './listings.repository';

function makeRepository() {
  return { expireOverdue: jest.fn() };
}

function makeAudit() {
  return { record: jest.fn().mockResolvedValue(undefined) };
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
  const db = makeDb();
  const logger = makeLogger();
  const service = new ListingExpiryService(
    repository as unknown as ListingsRepository,
    audit as unknown as AuditRepository,
    db as unknown as Database,
    logger as never,
  );
  return { service, audit, db, logger };
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
