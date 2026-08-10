import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OrgMembershipGuard } from './org-membership.guard';

@Module({
  imports: [DbModule],
  providers: [JwtAuthGuard, OrgMembershipGuard],
  exports: [JwtAuthGuard, OrgMembershipGuard],
})
export class AuthModule {}
