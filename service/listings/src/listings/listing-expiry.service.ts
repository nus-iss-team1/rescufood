import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from 'nestjs-pino';
import { ListingsRepository } from './listings.repository';

// Nobody claimed these in time: sweeps listings still `available` once
// their pickup window has closed and flips them to `expired`, along with
// any of their requests still `pending`/`accepted`. See
// listings_expiry_scan_idx in db/schema.ts, which is built for exactly this
// query, and ListingsRepository.expireOverdue for the update itself.
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
