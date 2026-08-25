import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { MailerService } from './mailer.service';
import { NotificationsRepository } from './notifications.repository';
import { SqsConsumerService } from './sqs-consumer.service';

@Module({
  imports: [DbModule],
  providers: [MailerService, NotificationsRepository, SqsConsumerService],
})
export class NotificationsModule {}
