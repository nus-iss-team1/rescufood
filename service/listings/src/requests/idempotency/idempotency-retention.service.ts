import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from 'nestjs-pino';
import { IdempotencyRepository } from './idempotency.repository';

// Prunes idempotency records once their retention window has elapsed. After a
// record is gone its key is treated as new on the next reuse.
@Injectable()
export class IdempotencyRetentionService {
  constructor(
    private readonly idempotency: IdempotencyRepository,
    private readonly logger: Logger,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweepExpiredKeys(): Promise<void> {
    try {
      const deleted = await this.idempotency.deleteExpired(new Date());
      if (deleted > 0) {
        this.logger.log({ deleted }, 'pruned expired idempotency records');
      }
    } catch (err) {
      this.logger.error({ err }, 'idempotency retention sweep failed');
    }
  }
}
