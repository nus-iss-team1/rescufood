import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { NotificationsPublisher } from '../notifications/notifications.publisher';
import { formatInstant, formatWindow } from './common/pickup-window.util';
import {
  RequestsRepository,
  type PickupReminderPhase,
} from './requests.repository';

const DEFAULT_REMINDER_LEAD_HOURS = 24;

// Emails a one-shot reminder as an active claim's pickup window approaches
// (opening -> rescue partner + donor) or nears its end (closing -> rescue
// partner). Each phase is marked once per claim so it can't repeat.
@Injectable()
export class PickupReminderService {
  private readonly leadMs: number;

  constructor(
    private readonly requestsRepository: RequestsRepository,
    private readonly notifications: NotificationsPublisher,
    private readonly logger: Logger,
    config: ConfigService,
  ) {
    const hours =
      config.get<number>('PICKUP_REMINDER_LEAD_HOURS') ??
      DEFAULT_REMINDER_LEAD_HOURS;
    this.leadMs = hours * 60 * 60 * 1000;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendPickupReminders(): Promise<void> {
    await this.run('opening');
    await this.run('closing');
  }

  private async run(phase: PickupReminderPhase): Promise<void> {
    try {
      const now = new Date();
      const marked = await this.requestsRepository.markDuePickupReminders(
        phase,
        now,
        this.leadMs,
      );
      if (marked.length === 0) return;

      const targets = await this.requestsRepository.findPickupReminderTargets(
        marked.map((m) => m.id),
      );
      await Promise.all(
        targets.flatMap((t) => {
          const payload = {
            phase,
            listingDescription: t.listingDescription,
            pickupLocation: t.pickupLocation,
            pickupWindow:
              formatWindow(t.pickupWindowStart, t.pickupWindowEnd) ??
              'the scheduled window',
            pickupWindowEnd: t.pickupWindowEnd
              ? formatInstant(t.pickupWindowEnd)
              : undefined,
          };
          const eventId = `claim:${t.claimId}:pickup-${phase}`;
          const sends = [
            this.notifications.pickupReminder(
              t.rescueEmail,
              { ...payload, recipientName: t.rescueName },
              { eventId, recipientUserId: t.rescueSub },
            ),
          ];
          if (phase === 'opening') {
            sends.push(
              this.notifications.pickupReminder(
                t.donorEmail,
                { ...payload, recipientName: t.donorName },
                { eventId, recipientUserId: t.donorSub },
              ),
            );
          }
          return sends;
        }),
      );
      this.logger.log({ phase, count: marked.length }, 'sent pickup reminders');
    } catch (err) {
      this.logger.error({ err, phase }, 'pickup reminder run failed');
    }
  }
}
