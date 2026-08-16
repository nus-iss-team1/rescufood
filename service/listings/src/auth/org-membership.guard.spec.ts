import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import type { Database } from '../db/db.module';
import { OrgContextGuard, OrgMembershipGuard } from './org-membership.guard';

// Mirrors the Drizzle chainable-thenable shape used in listings.service.spec.ts.
function chain(result: unknown) {
  const self: Record<string, unknown> = {
    then: (resolve: (v: unknown) => void) => resolve(result),
  };
  for (const method of ['from', 'where']) {
    self[method] = jest.fn(() => self);
  }
  return self;
}

function contextWithUser(userId: string): ExecutionContext {
  const request = { user: { userId, role: 'user' } } as unknown as Request;
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('OrgMembershipGuard', () => {
  it('allows a caller whose profile has an org_id', async () => {
    const db = { select: jest.fn() };
    db.select.mockReturnValue(chain([{ id: 'user-1', orgId: 'org-1' }]));
    const guard = new OrgMembershipGuard(db as unknown as Database);
    const context = contextWithUser('sub-1');

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("attaches the resolved orgId and overwrites userId with the profile's id", async () => {
    const db = { select: jest.fn() };
    db.select.mockReturnValue(chain([{ id: 'user-1', orgId: 'org-1' }]));
    const guard = new OrgMembershipGuard(db as unknown as Database);
    const request = {
      user: { userId: 'sub-1', role: 'user' },
    } as unknown as Request;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await guard.canActivate(context);

    expect(request.user!.orgId).toBe('org-1');
    expect(request.user!.userId).toBe('user-1');
  });

  it('throws ForbiddenException when the profile has no org_id', async () => {
    const db = { select: jest.fn() };
    db.select.mockReturnValue(chain([{ id: 'user-1', orgId: null }]));
    const guard = new OrgMembershipGuard(db as unknown as Database);

    await expect(
      guard.canActivate(contextWithUser('sub-1')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException when no profile row exists', async () => {
    const db = { select: jest.fn() };
    db.select.mockReturnValue(chain([]));
    const guard = new OrgMembershipGuard(db as unknown as Database);

    await expect(
      guard.canActivate(contextWithUser('sub-1')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('OrgContextGuard', () => {
  it("attaches the caller's orgId, overwrites userId with the profile's id, and allows the request through", async () => {
    const db = { select: jest.fn() };
    db.select.mockReturnValue(chain([{ id: 'user-1', orgId: 'org-1' }]));
    const guard = new OrgContextGuard(db as unknown as Database);
    const request = {
      user: { userId: 'sub-1', role: 'user' },
    } as unknown as Request;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user!.orgId).toBe('org-1');
    expect(request.user!.userId).toBe('user-1');
  });

  it('allows a caller with no profile row through, leaving userId and orgId untouched/undefined', async () => {
    const db = { select: jest.fn() };
    db.select.mockReturnValue(chain([]));
    const guard = new OrgContextGuard(db as unknown as Database);
    const request = {
      user: { userId: 'sub-1', role: 'user' },
    } as unknown as Request;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user!.orgId).toBeUndefined();
    expect(request.user!.userId).toBe('sub-1');
  });
});
