import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';
import { StatisticsController } from './statistics.controller';
import { StatisticsRepository } from './statistics.repository';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [AuditModule, AuthModule, DbModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, StatisticsRepository],
})
export class StatisticsModule {}
