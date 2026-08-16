import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import { DATABASE, type Database } from '../db/db.module';
import { users } from '../db/external.schema';

interface CallerProfile {
  // service/profile's internal users.id - distinct from the Cognito sub
  // JwtAuthGuard puts on request.user.userId. This is what listings/requests
  // rows' created_by/claimed_by/etc. FK against (see db/schema.ts), so it's
  // resolved here and written back onto request.user.userId for every
  // downstream read of it to use.
  id: string;
  orgId?: string;
}

async function resolveProfile(
  db: Database,
  cognitoSub: string,
): Promise<CallerProfile | undefined> {
  const [profile] = await db
    .select({ id: users.id, orgId: users.orgId })
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub));
  if (!profile) return undefined;
  return { id: profile.id, orgId: profile.orgId ?? undefined };
}

// Resolves the org behind an *already-resolved* profile id (users.id), as
// opposed to resolveProfile's lookup by the raw Cognito sub. Used where a
// previously persisted userId (e.g. requests.codeGeneratedBy) needs its
// current org re-checked.
export async function resolveOrgIdByUserId(
  db: Database,
  userId: string,
): Promise<string | undefined> {
  const [profile] = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.id, userId));
  return profile?.orgId ?? undefined;
}

// Runs after JwtAuthGuard. Blocks callers who aren't attached to an
// organisation yet (users.org_id is nullable - see service/profile's
// domain-matching signup flow) from actions that must be attributed to one,
// e.g. posting a listing.
@Injectable()
export class OrgMembershipGuard implements CanActivate {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const profile = await resolveProfile(this.db, request.user!.userId);

    if (!profile?.orgId) {
      throw new ForbiddenException(
        'you must belong to an organisation to do this',
      );
    }

    request.user!.userId = profile.id;
    request.user!.orgId = profile.orgId;
    return true;
  }
}

// Read-only counterpart to OrgMembershipGuard: resolves the caller's org (if
// any) onto request.user without rejecting callers who don't have one, so
// browsing listings doesn't require org membership. Read paths that need to
// decide draft-listing visibility use the attached orgId for that; everyone
// else's requests just pass through with orgId left undefined.
@Injectable()
export class OrgContextGuard implements CanActivate {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const profile = await resolveProfile(this.db, request.user!.userId);
    if (profile) {
      request.user!.userId = profile.id;
    }
    request.user!.orgId = profile?.orgId;
    return true;
  }
}
