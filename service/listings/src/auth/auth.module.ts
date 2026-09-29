import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { AdminGuard } from './admin.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OrgMembershipGuard } from './org-membership.guard';

@Module({
  imports: [DbModule],
  providers: [AdminGuard, JwtAuthGuard, OrgMembershipGuard],
  exports: [AdminGuard, JwtAuthGuard, OrgMembershipGuard],
})
export class AuthModule {}
