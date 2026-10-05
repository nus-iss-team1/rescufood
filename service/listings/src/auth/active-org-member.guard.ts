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
import { organisations, users } from '../db/external.schema';

// OrgMembershipGuard plus a live check that the caller is active and their org approved.
@Injectable()
export class ActiveOrgMemberGuard implements CanActivate {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const [caller] = await this.db
      .select({
        id: users.id,
        orgId: users.orgId,
        userStatus: users.status,
        orgStatus: organisations.status,
      })
      .from(users)
      .leftJoin(organisations, eq(users.orgId, organisations.id))
      .where(eq(users.cognitoSub, request.user!.userId));

    if (!caller?.orgId) {
      throw new ForbiddenException(
        'you must belong to an organisation to do this',
      );
    }
    if (caller.userStatus !== 'active') {
      throw new ForbiddenException('your account is not active');
    }
    if (caller.orgStatus !== 'approved') {
      throw new ForbiddenException('your organisation is not approved');
    }

    request.user!.userId = caller.id;
    request.user!.orgId = caller.orgId;
    return true;
  }
}
