import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { ActiveOrgMemberGuard } from './active-org-member.guard';
import { AdminGuard } from './admin.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OrgMembershipGuard } from './org-membership.guard';

@Module({
  imports: [DbModule],
  providers: [
    ActiveOrgMemberGuard,
    AdminGuard,
    JwtAuthGuard,
    OrgMembershipGuard,
  ],
  exports: [ActiveOrgMemberGuard, AdminGuard, JwtAuthGuard, OrgMembershipGuard],
})
export class AuthModule {}
