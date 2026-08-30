import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RequestsController } from './requests.controller';
import { RequestsRepository } from './requests.repository';
import { RequestsService } from './requests.service';

@Module({
  imports: [AuditModule, AuthModule, DbModule, NotificationsModule],
  controllers: [RequestsController],
  providers: [RequestsService, RequestsRepository],
})
export class RequestsModule {}
