import { Module } from '@nestjs/common';
import { NotificationsPublisher } from './notifications.publisher';

@Module({
  providers: [NotificationsPublisher],
  exports: [NotificationsPublisher],
})
export class NotificationsModule {}
