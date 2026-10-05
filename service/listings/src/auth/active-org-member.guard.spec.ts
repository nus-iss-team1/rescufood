import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import type { Database } from '../db/db.module';
import { ActiveOrgMemberGuard } from './active-org-member.guard';

// Mirrors the Drizzle chainable-thenable shape used in org-membership.guard.spec.ts.
function chain(result: unknown) {
  const self: Record<string, unknown> = {
    then: (resolve: (v: unknown) => void) => resolve(result),
  };
  for (const method of ['from', 'leftJoin', 'where']) {
    self[method] = jest.fn(() => self);
  }
  return self;
}

function guardReturning(rows: unknown[]) {
  const db = { select: jest.fn().mockReturnValue(chain(rows)) };
  return new ActiveOrgMemberGuard(db as unknown as Database);
}

function contextFor(request: Request): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function requestWithSub(sub: string) {
  return { user: { userId: sub, role: 'user' } } as unknown as Request;
}

const eligible = {
  id: 'user-1',
  orgId: 'org-1',
  userStatus: 'active',
  orgStatus: 'approved',
};

describe('ActiveOrgMemberGuard', () => {
  it("allows an active member of an approved org, attaching the profile's ids", async () => {
    const request = requestWithSub('sub-1');

    await expect(
      guardReturning([eligible]).canActivate(contextFor(request)),
    ).resolves.toBe(true);
    expect(request.user!.userId).toBe('user-1');
    expect(request.user!.orgId).toBe('org-1');
  });

  it.each([
    ['no profile row', []],
    ['no org', [{ ...eligible, orgId: null, orgStatus: null }]],
    ['a suspended user', [{ ...eligible, userStatus: 'suspended' }]],
    ['a pending org', [{ ...eligible, orgStatus: 'pending' }]],
    ['a rejected org', [{ ...eligible, orgStatus: 'rejected' }]],
    ['a suspended org', [{ ...eligible, orgStatus: 'suspended' }]],
    ['an unrecognised org status', [{ ...eligible, orgStatus: 'archived' }]],
  ])(
    'denies a caller with %s, leaving the request untouched',
    async (_, rows) => {
      const request = requestWithSub('sub-1');

      await expect(
        guardReturning(rows).canActivate(contextFor(request)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(request.user!.userId).toBe('sub-1');
      expect(request.user!.orgId).toBeUndefined();
    },
  );
});
