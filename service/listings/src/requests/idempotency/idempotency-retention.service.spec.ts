import type { IdempotencyRepository } from './idempotency.repository';
import { IdempotencyRetentionService } from './idempotency-retention.service';

function makeLogger() {
  return { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

function make(deleteExpired: jest.Mock) {
  const idempotency = { deleteExpired } as unknown as IdempotencyRepository;
  const logger = makeLogger();
  return {
    service: new IdempotencyRetentionService(idempotency, logger as never),
    logger,
  };
}

describe('IdempotencyRetentionService', () => {
  it('prunes expired records and logs how many', async () => {
    const deleteExpired = jest.fn().mockResolvedValue(3);
    const { service, logger } = make(deleteExpired);

    await service.sweepExpiredKeys();

    expect(deleteExpired).toHaveBeenCalledWith(expect.any(Date));
    expect(logger.log).toHaveBeenCalledWith(
      { deleted: 3 },
      expect.stringMatching(/pruned/i),
    );
  });

  it('stays quiet when nothing expired', async () => {
    const { service, logger } = make(jest.fn().mockResolvedValue(0));

    await service.sweepExpiredKeys();

    expect(logger.log).not.toHaveBeenCalled();
  });

  it('swallows and logs a sweep failure', async () => {
    const { service, logger } = make(
      jest.fn().mockRejectedValue(new Error('db down')),
    );

    await expect(service.sweepExpiredKeys()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});
