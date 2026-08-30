import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from 'nestjs-pino';
import { AuditAction } from '../audit/audit.actions';
import { AuditRepository, SYSTEM_ACTOR } from '../audit/audit.repository';
import { DATABASE, type Database } from '../db/db.module';
import { NotificationsPublisher } from '../notifications/notifications.publisher';
import { ListingsRepository } from './listings.repository';

// Once a minute, expires any listing past its pickup window - unclaimed, or
// claimed but never collected - along with its `active` claim, if any. See
// ListingsRepository.expireOverdue.
@Injectable()
export class ListingExpiryService {
  constructor(
    private readonly listingsRepository: ListingsRepository,
    private readonly auditRepository: AuditRepository,
    private readonly notifications: NotificationsPublisher,
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

    if (listingIds.length === 0) return;

    this.logger.log(
      { expiredListings: listingIds.length, expiredClaims: claimIds.length },
      'expired overdue listings',
    );
    await this.notifyExpired(listingIds, claimIds);
  }

  // Best-effort: emails each expired listing's donor and each stranded claimant.
  private async notifyExpired(
    listingIds: string[],
    claimIds: string[],
  ): Promise<void> {
    try {
      const [listingTargets, claimTargets] = await Promise.all([
        this.listingsRepository.findExpiredListingTargets(listingIds),
        this.listingsRepository.findExpiredClaimTargets(claimIds),
      ]);
      await Promise.all([
        ...listingTargets.map((t) =>
          this.notifications.listingExpired(t.donorEmail, {
            recipientName: t.donorName,
            listingDescription: t.description,
            wasClaimed: claimIds.length > 0,
          }),
        ),
        ...claimTargets.map((t) =>
          this.notifications.listingExpired(t.rescueEmail, {
            recipientName: t.rescueName,
            listingDescription: t.listingDescription,
            wasClaimed: true,
          }),
        ),
      ]);
    } catch (err) {
      this.logger.error({ err }, 'expiry notifications failed');
    }
  }
}
