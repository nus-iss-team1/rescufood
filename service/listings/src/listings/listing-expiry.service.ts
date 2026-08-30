import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from 'nestjs-pino';
import { AuditAction } from '../audit/audit.actions';
import { AuditRepository, SYSTEM_ACTOR } from '../audit/audit.repository';
import { DATABASE, type Database } from '../db/db.module';
import { ListingsRepository } from './listings.repository';

// Once a minute, expires any listing past its pickup window - unclaimed, or
// claimed but never collected - along with its `active` claim, if any. See
// ListingsRepository.expireOverdue.
@Injectable()
export class ListingExpiryService {
  constructor(
    private readonly listingsRepository: ListingsRepository,
    private readonly auditRepository: AuditRepository,
    @Inject(DATABASE) private readonly db: Database,
    private readonly logger: Logger,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sweepExpiredListings(): Promise<void> {
    const { listingIds, claimIds } = await this.db.transaction(async (tx) => {
      const result = await this.listingsRepository.expireOverdue(
        new Date(),
        tx,
      );
      for (const id of result.listingIds) {
        await this.auditRepository.record(
          {
            actor: SYSTEM_ACTOR,
            action: AuditAction.ListingExpired,
            entityType: 'listing',
            entityId: id,
          },
          tx,
        );
      }
      for (const id of result.claimIds) {
        await this.auditRepository.record(
          {
            actor: SYSTEM_ACTOR,
            action: AuditAction.ClaimExpired,
            entityType: 'claim',
            entityId: id,
          },
          tx,
        );
      }
      return result;
    });

    if (listingIds.length > 0) {
      this.logger.log(
        { expiredListings: listingIds.length, expiredClaims: claimIds.length },
        'expired overdue listings',
      );
    }
  }
}
