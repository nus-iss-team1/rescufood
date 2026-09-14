import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Server } from 'node:http';
import type { Pool } from 'pg';
import { databaseUrl } from './db';
import type { SeededUser } from './db';

// Config the app's providers read at construction.
function setEnv(): void {
  process.env.DATABASE_URL = databaseUrl();
  process.env.AUTH_COGNITO_ISSUER ??= 'https://cognito.test/pool';
  process.env.AWS_REGION ??= 'ap-southeast-1';
  process.env.S3_BUCKET_NAME ??= 'test-bucket';
  process.env.LISTING_IMAGES_CDN_URL ??= 'https://cdn.test';
  process.env.CORS_ALLOWED_ORIGINS ??= 'http://localhost:5173';
}

// Replaces JwtAuthGuard: reads the Cognito sub from a header instead of a token.
const jwtStub = {
  canActivate: (context: {
    switchToHttp: () => { getRequest: () => Record<string, unknown> };
  }) => {
    const req = context.switchToHttp().getRequest() as {
      headers: Record<string, string | undefined>;
      user?: unknown;
    };
    const sub = req.headers['x-test-sub'];
    if (!sub) return false;
    req.user = { userId: sub, role: req.headers['x-test-role'] ?? 'user' };
    return true;
  },
};

export interface TestApp {
  app: INestApplication;
  server: Server;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  setEnv();

  const { AppModule } = await import('../../../src/app.module');
  const { JwtAuthGuard } = await import('../../../src/auth/jwt-auth.guard');
  const { PG_POOL } = await import('../../../src/db/db.module');
  const { PARAMS_PROVIDER_TOKEN } = await import('nestjs-pino');

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(JwtAuthGuard)
    .useValue(jwtStub)
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .overrideProvider(PARAMS_PROVIDER_TOKEN)
    .useValue({ pinoHttp: { level: 'silent' } })
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');
  await app.init();

  const pool = app.get<Pool>(PG_POOL);

  return {
    app,
    server: app.getHttpServer() as Server,
    close: async () => {
      await app.close();
      await pool.end();
    },
  };
}

// Typed accessor for a supertest response body.
export function body<T>(res: { body: unknown }): T {
  return res.body as T;
}

// Auth headers the jwtStub and org guards resolve to this user.
export function authHeaders(
  user: Pick<SeededUser, 'cognitoSub'>,
  role: 'user' | 'admin' = 'user',
): Record<string, string> {
  return { 'x-test-sub': user.cognitoSub, 'x-test-role': role };
}
