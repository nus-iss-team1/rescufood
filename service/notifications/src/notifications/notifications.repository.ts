import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '../db/db.module';
import { notifications } from '../db/schema';
import type {
  NotificationChannel,
  NotificationType,
} from './notification-message.dto';

export interface NotificationRecord {
  recipientEmail: string;
  type: NotificationType;
  channel: NotificationChannel;
  payload: Record<string, unknown>;
  status: 'sent' | 'failed';
  failureReason?: string;
}

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async record(entry: NotificationRecord): Promise<void> {
    await this.db.insert(notifications).values(entry);
  }
}
