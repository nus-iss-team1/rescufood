import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

// Cognito group whose members are platform admins (see service/profile's adminGroup).
const ADMIN_GROUP = 'admin';

// Validates Cognito-issued bearer tokens against the pool's JWKS and attaches
// { userId, role } to the request, mirroring service/listings' guard.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly issuer: string;
  private readonly jwks: JWTVerifyGetKey;

  constructor(config: ConfigService) {
    this.issuer = config.getOrThrow<string>('AUTH_COGNITO_ISSUER');
    this.jwks = createRemoteJWKSet(
      new URL(`${this.issuer}/.well-known/jwks.json`),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('missing bearer token');
    }

    const payload = await this.verify(token);
    const userId = payload.sub;
    if (!userId) {
      throw new UnauthorizedException('token missing sub claim');
    }

    const groups = Array.isArray(payload['cognito:groups'])
      ? (payload['cognito:groups'] as string[])
      : [];
    const role = groups.includes(ADMIN_GROUP) ? 'admin' : 'user';

    request.user = { userId, role };
    return true;
  }

  private async verify(token: string) {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
      });
      return payload;
    } catch {
      throw new UnauthorizedException('invalid token');
    }
  }
}

function extractBearerToken(header?: string): string | undefined {
  if (!header?.startsWith('Bearer ')) {
    return undefined;
  }
  const token = header.slice('Bearer '.length).trim();
  return token || undefined;
}
