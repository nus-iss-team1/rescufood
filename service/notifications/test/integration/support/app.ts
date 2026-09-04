import { UnauthorizedException, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import type { Pool } from 'pg';
import { databaseUrl } from './db';

function setEnv(): void {
  process.env.DATABASE_URL = databaseUrl();
  process.env.AUTH_COGNITO_ISSUER ??= 'https://cognito.test/pool';
  process.env.AWS_REGION ??= 'ap-southeast-1';
  process.env.NOTIFICATION_QUEUE_URL ??= 'https://sqs.test/queue';
  process.env.GMAIL_USER ??= 'noreply@example.org';
  process.env.GMAIL_APP_PASSWORD ??= 'test-password';
  process.env.CORS_ALLOWED_ORIGINS ??= 'http://localhost:3000';
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
    if (!sub) throw new UnauthorizedException('missing bearer token');
    req.user = { userId: sub, role: req.headers['x-test-role'] ?? 'user' };
    return true;
  },
};

// The SQS poll loop must not start in tests.
const consumerStub = {};

export interface TestApp {
  app: INestApplication;
  server: Server;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  setEnv();

  const { AppModule } = await import('../../../src/app.module');
  const { JwtAuthGuard } = await import('../../../src/auth/jwt-auth.guard');
  const { SqsConsumerService } =
    await import('../../../src/notifications/sqs-consumer.service');
  const { PG_POOL } = await import('../../../src/db/db.module');
  const { PARAMS_PROVIDER_TOKEN } = await import('nestjs-pino');

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(JwtAuthGuard)
    .useValue(jwtStub)
    .overrideProvider(SqsConsumerService)
    .useValue(consumerStub)
    .overrideProvider(PARAMS_PROVIDER_TOKEN)
    .useValue({ pinoHttp: { level: 'silent' } })
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
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

// Auth headers the jwtStub resolves to this Cognito sub.
export function authHeaders(sub: string): Record<string, string> {
  return { 'x-test-sub': sub };
}
