import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { ActiveOrgMemberOrAdminGuard } from './active-org-member-or-admin.guard';
import type { ActiveOrgMemberGuard } from './active-org-member.guard';
import type { OrgContextGuard } from './org-membership.guard';

function contextFor(role: string): ExecutionContext {
  const request = { user: { userId: 'sub-1', role } } as unknown as Request;
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function makeGuard() {
  const activeOrgMember = { canActivate: jest.fn().mockResolvedValue(true) };
  const orgContext = { canActivate: jest.fn().mockResolvedValue(true) };
  const guard = new ActiveOrgMemberOrAdminGuard(
    activeOrgMember as unknown as ActiveOrgMemberGuard,
    orgContext as unknown as OrgContextGuard,
  );
  return { guard, activeOrgMember, orgContext };
}

describe('ActiveOrgMemberOrAdminGuard', () => {
  it('holds a regular caller to the active-org-member check', async () => {
    const { guard, activeOrgMember, orgContext } = makeGuard();
    const context = contextFor('user');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(activeOrgMember.canActivate).toHaveBeenCalledWith(context);
    expect(orgContext.canActivate).not.toHaveBeenCalled();
  });

  it("propagates the active-org-member check's denial", async () => {
    const { guard, activeOrgMember } = makeGuard();
    activeOrgMember.canActivate.mockRejectedValue(
      new ForbiddenException('your organisation is not approved'),
    );

    await expect(guard.canActivate(contextFor('user'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lets an admin through with only the org context resolved', async () => {
    const { guard, activeOrgMember, orgContext } = makeGuard();
    const context = contextFor('admin');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(orgContext.canActivate).toHaveBeenCalledWith(context);
    expect(activeOrgMember.canActivate).not.toHaveBeenCalled();
  });
});
