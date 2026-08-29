import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from 'nestjs-pino';
import { ListingsRepository } from './listings.repository';

// Once a minute, expires any `available` listing past its pickup window
// (nobody claimed it in time) and its `active` claim, if any. See
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
