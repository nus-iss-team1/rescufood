import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard } from './admin.guard';

const contextFor = (user?: { userId: string; role: string }) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) as Request }),
  }) as ExecutionContext;

describe('AdminGuard', () => {
  it('admits an admin', () => {
    expect(
      new AdminGuard().canActivate(contextFor({ userId: 'u1', role: 'admin' })),
    ).toBe(true);
  });

  it('rejects a non-admin', () => {
    expect(() =>
      new AdminGuard().canActivate(contextFor({ userId: 'u1', role: 'user' })),
    ).toThrow(ForbiddenException);
  });

  it('rejects an unauthenticated request', () => {
    expect(() => new AdminGuard().canActivate(contextFor())).toThrow(
      ForbiddenException,
    );
  });
});
