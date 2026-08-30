import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Logger } from 'nestjs-pino';

type NotificationType =
  | 'claim_created'
  | 'claim_cancelled'
  | 'pickup_reminder'
  | 'pickup_completed'
  | 'listing_expired';

// Publishes notification events to the queue service/notifications consumes.
// Nil-safe (no queue url = disabled) and best-effort (send failures logged).
@Injectable()
export class NotificationsPublisher {
  private readonly client?: SQSClient;
  private readonly queueUrl?: string;

  constructor(
    config: ConfigService,
    private readonly logger: Logger,
  ) {
    this.queueUrl = config.get<string>('NOTIFICATION_QUEUE_URL') || undefined;
    if (!this.queueUrl) {
      this.logger.warn(
        'NOTIFICATION_QUEUE_URL not set; notifications are disabled',
      );
      return;
    }
    this.client = new SQSClient({
      region: config.getOrThrow<string>('AWS_REGION'),
    });
  }

  // Tells the donor a partner claimed their listing.
  claimCreated(to: string, payload: ClaimCreatedPayload): Promise<void> {
    return this.publish('claim_created', to, payload);
  }

  // Tells the other party a claim ended before pickup.
  claimEnded(to: string, payload: ClaimEndedPayload): Promise<void> {
    return this.publish('claim_cancelled', to, payload);
  }

  // Reminds a party that a pickup window is opening or closing soon.
  pickupReminder(to: string, payload: PickupReminderPayload): Promise<void> {
    return this.publish('pickup_reminder', to, payload);
  }

  // Tells both parties a pickup was verified.
  pickupCompleted(to: string, payload: PickupCompletedPayload): Promise<void> {
    return this.publish('pickup_completed', to, payload);
  }

  // Tells the donor (and any claimant) a listing lapsed.
  listingExpired(to: string, payload: ListingExpiredPayload): Promise<void> {
    return this.publish('listing_expired', to, payload);
  }

  private async publish(
    type: NotificationType,
    recipientEmail: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!this.client || !this.queueUrl || !recipientEmail) return;
    try {
      await this.client.send(
        new SendMessageCommand({
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify({
            type,
            channel: 'email',
            recipientEmail,
            payload,
          }),
        }),
      );
    } catch (err) {
      this.logger.error(
        { err, type, recipientEmail },
        'failed to publish notification',
      );
    }
  }
}

export type ClaimCreatedPayload = {
  listingDescription: string | null;
  rescueOrgName: string;
  pickupLocation?: string | null;
  pickupWindow?: string;
};

export type ClaimEndedPayload = {
  listingDescription: string | null;
  endedBy: 'donor' | 'rescue_partner' | 'no_show';
  reason?: string;
};

export type PickupReminderPayload = {
  phase: 'opening' | 'closing';
  listingDescription: string | null;
  pickupLocation?: string | null;
  pickupWindow: string;
};

export type PickupCompletedPayload = {
  listingDescription: string | null;
  collectedQuantity?: string;
};

export type ListingExpiredPayload = {
  listingDescription: string | null;
  wasClaimed: boolean;
};
