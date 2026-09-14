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

// Stable per-recipient identity for one domain event. eventId drives the
// notification service's duplicate-processing protection; recipientUserId
// (the recipient's Cognito sub) is what an in-app notification is filed under.
export interface NotificationIdentity {
  eventId: string;
  recipientUserId?: string | null;
}

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
  claimCreated(
    to: string,
    payload: ClaimCreatedPayload,
    identity: NotificationIdentity,
  ): Promise<void> {
    return this.publish('claim_created', to, payload, identity);
  }

  // Tells the other party a claim ended before pickup.
  claimEnded(
    to: string,
    payload: ClaimEndedPayload,
    identity: NotificationIdentity,
  ): Promise<void> {
    return this.publish('claim_cancelled', to, payload, identity);
  }

  // Reminds a party that a pickup window is opening or closing soon.
  pickupReminder(
    to: string,
    payload: PickupReminderPayload,
    identity: NotificationIdentity,
  ): Promise<void> {
    return this.publish('pickup_reminder', to, payload, identity);
  }

  // Tells both parties a pickup was verified.
  pickupCompleted(
    to: string,
    payload: PickupCompletedPayload,
    identity: NotificationIdentity,
  ): Promise<void> {
    return this.publish('pickup_completed', to, payload, identity);
  }

  // Tells the donor (and any claimant) a listing lapsed.
  listingExpired(
    to: string,
    payload: ListingExpiredPayload,
    identity: NotificationIdentity,
  ): Promise<void> {
    return this.publish('listing_expired', to, payload, identity);
  }

  private async publish(
    type: NotificationType,
    recipientEmail: string,
    payload: Record<string, unknown>,
    identity: NotificationIdentity,
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
            recipientUserId: identity.recipientUserId ?? undefined,
            eventId: identity.eventId,
            payload,
          }),
        }),
      );
    } catch (err) {
      this.logger.error(
        { err, type, recipientEmail, eventId: identity.eventId },
        'failed to publish notification',
      );
    }
  }
}

export type ClaimCreatedPayload = {
  recipientName?: string | null;
  listingDescription: string | null;
  rescuePartnerName?: string | null;
  rescueOrgName: string;
  pickupLocation?: string | null;
  pickupWindow?: string;
  // Who this copy is for - the donor whose listing was reserved, or the
  // rescue partner who reserved it.
  audience?: 'donor' | 'rescue_partner';
};

export type ClaimEndedPayload = {
  recipientName?: string | null;
  listingDescription: string | null;
  endedBy: 'donor' | 'rescue_partner' | 'no_show';
  counterpartyName?: string | null;
  counterpartyOrgName?: string | null;
  reason?: string;
};

export type PickupReminderPayload = {
  phase: 'opening' | 'closing';
  recipientName?: string | null;
  listingDescription: string | null;
  pickupLocation?: string | null;
  pickupWindow: string;
  pickupWindowEnd?: string;
};

export type PickupCompletedPayload = {
  recipientName?: string | null;
  listingDescription: string | null;
  collectedQuantity?: string;
};

export type ListingExpiredPayload = {
  recipientName?: string | null;
  listingDescription: string | null;
  wasClaimed: boolean;
};
