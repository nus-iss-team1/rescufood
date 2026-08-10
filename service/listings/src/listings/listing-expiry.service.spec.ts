import { ListingExpiryService } from './listing-expiry.service';
import { ListingsRepository } from './listings.repository';

function makeRepository() {
  return { expireOverdue: jest.fn() };
}

function makeLogger() {
  return { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

describe('ListingExpiryService', () => {
  it('logs how many listings were expired when the sweep finds overdue listings', async () => {
    const repository = makeRepository();
    repository.expireOverdue.mockResolvedValue(3);
    const logger = makeLogger();
    const service = new ListingExpiryService(
      repository as unknown as ListingsRepository,
      logger as never,
    );

    await service.sweepExpiredListings();

    expect(repository.expireOverdue).toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      { expiredCount: 3 },
      'expired overdue listings',
    );
  });

  it('does not log when nothing was overdue', async () => {
    const repository = makeRepository();
    repository.expireOverdue.mockResolvedValue(0);
    const logger = makeLogger();
    const service = new ListingExpiryService(
      repository as unknown as ListingsRepository,
      logger as never,
    );

    await service.sweepExpiredListings();

    expect(logger.log).not.toHaveBeenCalled();
  });
});
