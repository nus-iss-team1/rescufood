import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { ActiveOrgMemberOrAdminGuard } from './active-org-member-or-admin.guard';
import { ActiveOrgMemberGuard } from './active-org-member.guard';
import { AdminGuard } from './admin.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OrgContextGuard, OrgMembershipGuard } from './org-membership.guard';

@Module({
  imports: [DbModule],
  providers: [
    ActiveOrgMemberGuard,
    ActiveOrgMemberOrAdminGuard,
    AdminGuard,
    JwtAuthGuard,
    OrgContextGuard,
    OrgMembershipGuard,
  ],
  exports: [
    ActiveOrgMemberGuard,
    ActiveOrgMemberOrAdminGuard,
    AdminGuard,
    JwtAuthGuard,
    OrgContextGuard,
    OrgMembershipGuard,
  ],
})
export class AuthModule {}
