import { ListingExpiryService } from './listing-expiry.service';
import { ListingsRepository } from './listings.repository';

function makeRepository() {
  return { expireOverdue: jest.fn() };
}

function makeLogger() {
  return { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

describe('ListingExpiryService', () => {
  it('logs how many listings and requests were expired when the sweep finds overdue listings', async () => {
    const repository = makeRepository();
    repository.expireOverdue.mockResolvedValue({
      expiredListings: 3,
      expiredRequests: 2,
    });
    const logger = makeLogger();
    const service = new ListingExpiryService(
      repository as unknown as ListingsRepository,
      logger as never,
    );

    await service.sweepExpiredListings();

    expect(repository.expireOverdue).toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      { expiredListings: 3, expiredRequests: 2 },
      'expired overdue listings',
    );
  });

  it('does not log when nothing was overdue', async () => {
    const repository = makeRepository();
    repository.expireOverdue.mockResolvedValue({
      expiredListings: 0,
      expiredRequests: 0,
    });
    const logger = makeLogger();
    const service = new ListingExpiryService(
      repository as unknown as ListingsRepository,
      logger as never,
    );

    await service.sweepExpiredListings();

    expect(logger.log).not.toHaveBeenCalled();
  });
});
