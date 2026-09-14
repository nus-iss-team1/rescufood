import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { AuditRepository } from './audit.repository';

@Module({
  imports: [DbModule],
  providers: [AuditRepository],
  exports: [AuditRepository],
})
export class AuditModule {}
