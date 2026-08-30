import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from 'nestjs-pino';
import { ListingsRepository } from './listings.repository';

// Once a minute, expires any listing past its pickup window - unclaimed, or
// claimed but never collected - along with its `active` claim, if any. See
// ListingsRepository.expireOverdue.
@Injectable()
export class ListingExpiryService {
  constructor(
    private readonly listingsRepository: ListingsRepository,
    private readonly logger: Logger,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sweepExpiredListings(): Promise<void> {
    const { expiredListings, expiredRequests } =
      await this.listingsRepository.expireOverdue();
    if (expiredListings > 0) {
      this.logger.log(
        { expiredListings, expiredRequests },
        'expired overdue listings',
      );
    }
  }
}
