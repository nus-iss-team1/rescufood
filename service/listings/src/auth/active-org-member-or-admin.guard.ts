import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ActiveOrgMemberGuard } from './active-org-member.guard';
import { OrgContextGuard } from './org-membership.guard';

// ActiveOrgMemberGuard for regular callers; admins pass with their org context resolved.
@Injectable()
export class ActiveOrgMemberOrAdminGuard implements CanActivate {
  constructor(
    private readonly activeOrgMember: ActiveOrgMemberGuard,
    private readonly orgContext: OrgContextGuard,
  ) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    return request.user!.role === 'admin'
      ? this.orgContext.canActivate(context)
      : this.activeOrgMember.canActivate(context);
  }
}
