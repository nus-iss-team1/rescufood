import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from 'nestjs-pino';
import { AuditAction } from '../audit/audit.actions';
import { AuditRepository, SYSTEM_ACTOR } from '../audit/audit.repository';
import { DATABASE, type Database } from '../db/db.module';
import { NotificationsPublisher } from '../notifications/notifications.publisher';
import { ListingsRepository } from './listings.repository';

type ExpiredListing = { listingId: string; claimId: string | undefined };

// Once a minute, expires each overdue listing and its active claim, one transaction per listing.
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
    const now = new Date();
    let overdueIds: string[];
    try {
      overdueIds = await this.listingsRepository.findOverdueListingIds(now);
    } catch (err) {
      this.logger.error({ err }, 'listing expiry sweep failed');
      return;
    }

    const expired: ExpiredListing[] = [];
    const failedListingIds: string[] = [];
    for (const listingId of overdueIds) {
      try {
        const result = await this.expireOne(listingId, now);
        if (result) expired.push(result);
      } catch (err) {
        failedListingIds.push(listingId);
        this.logger.error({ err, listingId }, 'failed to expire listing');
      }
    }

    if (expired.length === 0 && failedListingIds.length === 0) return;

    this.logger.log(
      {
        expiredListings: expired.length,
        expiredClaims: expired.filter((e) => e.claimId).length,
        failedListings: failedListingIds.length,
      },
      'expired overdue listings',
    );
    await this.notifyExpired(expired);
  }

  // Expires and audits one listing atomically; undefined if no longer overdue.
  private expireOne(
    listingId: string,
    now: Date,
  ): Promise<ExpiredListing | undefined> {
    return this.db.transaction(async (tx) => {
      const result = await this.listingsRepository.expireListing(
        listingId,
        now,
        tx,
      );
      if (!result) return undefined;

      await this.auditRepository.record(
        {
          actor: SYSTEM_ACTOR,
          action: AuditAction.ListingExpired,
          entityType: 'listing',
          entityId: listingId,
        },
        tx,
      );
      if (result.claimId) {
        await this.auditRepository.record(
          {
            actor: SYSTEM_ACTOR,
            action: AuditAction.ClaimExpired,
            entityType: 'claim',
            entityId: result.claimId,
          },
          tx,
        );
      }
      return { listingId, claimId: result.claimId };
    });
  }

  // Best-effort: emails each expired listing's donor and each stranded claimant.
  private async notifyExpired(expired: ExpiredListing[]): Promise<void> {
    if (expired.length === 0) return;
    const claimIds = expired.flatMap((e) => (e.claimId ? [e.claimId] : []));
    const claimedListingIds = new Set(
      expired.filter((e) => e.claimId).map((e) => e.listingId),
    );
    try {
      const [listingTargets, claimTargets] = await Promise.all([
        this.listingsRepository.findExpiredListingTargets(
          expired.map((e) => e.listingId),
        ),
        this.listingsRepository.findExpiredClaimTargets(claimIds),
      ]);
      await Promise.all([
        ...listingTargets.map((t) =>
          this.notifications.listingExpired(
            t.donorEmail,
            {
              recipientName: t.donorName,
              listingDescription: t.description,
              wasClaimed: claimedListingIds.has(t.id),
            },
            {
              eventId: `listing:${t.id}:expired`,
              recipientUserId: t.donorSub,
            },
          ),
        ),
        ...claimTargets.map((t) =>
          this.notifications.listingExpired(
            t.rescueEmail,
            {
              recipientName: t.rescueName,
              listingDescription: t.listingDescription,
              wasClaimed: true,
            },
            {
              eventId: `listing:${t.listingId}:expired`,
              recipientUserId: t.rescueSub,
            },
          ),
        ),
      ]);
    } catch (err) {
      this.logger.error({ err }, 'expiry notifications failed');
    }
  }
}
