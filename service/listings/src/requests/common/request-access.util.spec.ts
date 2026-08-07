import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/types/express';
import {
  assertIsParty,
  assertCanRespond,
  isRequestVisible,
} from './request-access.util';

const donorUser: AuthenticatedUser = {
  userId: 'user-donor',
  role: 'user',
  orgId: 'org-donor',
};
const rescueUser: AuthenticatedUser = {
  userId: 'user-rescue',
  role: 'user',
  orgId: 'org-rescue',
};
const outsider: AuthenticatedUser = {
  userId: 'user-outsider',
  role: 'user',
  orgId: 'org-outsider',
};
const admin: AuthenticatedUser = {
  userId: 'admin-1',
  role: 'admin',
  orgId: 'org-admin',
};

const listing = { donorOrgId: 'org-donor' };
const request = { rescueOrgId: 'org-rescue' };

describe('assertCanRespond', () => {
  it('allows the donor org', () => {
    expect(() => assertCanRespond(listing, donorUser)).not.toThrow();
  });

  it('allows an admin regardless of org', () => {
    expect(() => assertCanRespond(listing, admin)).not.toThrow();
  });

  it('rejects the rescue org', () => {
    expect(() => assertCanRespond(listing, rescueUser)).toThrow(
      ForbiddenException,
    );
  });

  it('rejects an outsider', () => {
    expect(() => assertCanRespond(listing, outsider)).toThrow(
      ForbiddenException,
    );
  });
});

describe('assertIsParty', () => {
  it('allows the rescue org that filed the request', () => {
    expect(() => assertIsParty(request, listing, rescueUser)).not.toThrow();
  });

  it('allows the donor org that owns the listing', () => {
    expect(() => assertIsParty(request, listing, donorUser)).not.toThrow();
  });

  it('allows an admin regardless of org', () => {
    expect(() => assertIsParty(request, listing, admin)).not.toThrow();
  });

  it('rejects an outsider', () => {
    expect(() => assertIsParty(request, listing, outsider)).toThrow(
      ForbiddenException,
    );
  });
});

describe('isRequestVisible', () => {
  it('is visible to the rescue org', () => {
    expect(isRequestVisible(request, listing, rescueUser)).toBe(true);
  });

  it('is visible to the donor org', () => {
    expect(isRequestVisible(request, listing, donorUser)).toBe(true);
  });

  it('is visible to an admin', () => {
    expect(isRequestVisible(request, listing, admin)).toBe(true);
  });

  it('is not visible to an outsider', () => {
    expect(isRequestVisible(request, listing, outsider)).toBe(false);
  });
});
