import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MailerService } from './mailer.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { SqsConsumerService } from './sqs-consumer.service';

@Module({
  imports: [DbModule],
  controllers: [NotificationsController],
  providers: [
    MailerService,
    NotificationsRepository,
    SqsConsumerService,
    JwtAuthGuard,
  ],
})
export class NotificationsModule {}
