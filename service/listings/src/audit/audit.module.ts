import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../db/db.module';
import { AuditController } from './audit.controller';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

@Module({
  imports: [AuthModule, DbModule],
  controllers: [AuditController],
  providers: [AuditRepository, AuditService],
  exports: [AuditRepository],
})
export class AuditModule {}
