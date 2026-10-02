import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

// Runs after JwtAuthGuard. Restricts a route to platform admins.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.user?.role !== 'admin') {
      throw new ForbiddenException(
        'this endpoint is restricted to administrators',
      );
    }
    return true;
  }
}
