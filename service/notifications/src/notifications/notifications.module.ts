import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { MailerService } from './mailer.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { SqsConsumerService } from './sqs-consumer.service';

@Module({
  imports: [DbModule],
  controllers: [NotificationsController],
  providers: [MailerService, NotificationsRepository, SqsConsumerService],
})
export class NotificationsModule {}
