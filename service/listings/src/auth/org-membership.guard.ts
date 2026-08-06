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

// Runs after JwtAuthGuard. Blocks callers who aren't attached to an
// organisation yet (users.org_id is nullable - see service/profile's
// domain-matching signup flow) from actions that must be attributed to one,
// e.g. posting a listing.
@Injectable()
export class OrgMembershipGuard implements CanActivate {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.user!.userId;

    const [profile] = await this.db
      .select({ orgId: users.orgId })
      .from(users)
      .where(eq(users.cognitoSub, userId));

    if (!profile?.orgId) {
      throw new ForbiddenException(
        'you must belong to an organisation to do this',
      );
    }

    request.user!.orgId = profile.orgId;
    return true;
  }
}
