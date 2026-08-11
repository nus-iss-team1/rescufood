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

export async function resolveOrgId(
  db: Database,
  userId: string,
): Promise<string | undefined> {
  const [profile] = await db
    .select({ orgId: users.orgId })
    .from(users)
    .where(eq(users.cognitoSub, userId));
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
    const orgId = await resolveOrgId(this.db, request.user!.userId);

    if (!orgId) {
      throw new ForbiddenException(
        'you must belong to an organisation to do this',
      );
    }

    request.user!.orgId = orgId;
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
    request.user!.orgId = await resolveOrgId(this.db, request.user!.userId);
    return true;
  }
}
