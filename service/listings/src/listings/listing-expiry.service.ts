import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from 'nestjs-pino';
import { ListingsRepository } from './listings.repository';

// Nobody claimed these in time: sweeps listings still `available` once
// their pickup window has closed and flips them to `expired`. See
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
    const expiredCount = await this.listingsRepository.expireOverdue();
    if (expiredCount > 0) {
      this.logger.log({ expiredCount }, 'expired overdue listings');
    }
  }
}
