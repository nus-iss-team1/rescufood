import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';
import { SummaryController } from './summary.controller';
import { SummaryRepository } from './summary.repository';
import { SummaryService } from './summary.service';

@Module({
  imports: [AuthModule, DbModule],
  controllers: [SummaryController],
  providers: [SummaryService, SummaryRepository],
})
export class SummaryModule {}
