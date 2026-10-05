import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Server } from 'node:http';
import type { Pool } from 'pg';
import { databaseUrl } from './db';

const ISSUER = 'https://cognito.test/pool';

function setEnv(): void {
  process.env.DATABASE_URL = databaseUrl();
  process.env.AUTH_COGNITO_ISSUER = ISSUER;
  process.env.AWS_REGION ??= 'ap-southeast-1';
  process.env.NOTIFICATION_QUEUE_URL ??= 'https://sqs.test/queue';
  process.env.GMAIL_USER ??= 'noreply@example.org';
  process.env.GMAIL_APP_PASSWORD ??= 'test-password';
  process.env.CORS_ALLOWED_ORIGINS ??= 'http://localhost:3000';
}

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
  const { SqsConsumerService } =
    await import('../../../src/notifications/sqs-consumer.service');
  const { PG_POOL } = await import('../../../src/db/db.module');
  const { PARAMS_PROVIDER_TOKEN } = await import('nestjs-pino');

  // The throttler is stubbed: a spec file exceeds one caller's budget.
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .overrideProvider(SqsConsumerService)
    .useValue(consumerStub)
    .overrideProvider(PARAMS_PROVIDER_TOKEN)
    .useValue({ pinoHttp: { level: 'silent' } })
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
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

const segment = (value: object): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

// A Cognito-shaped ID token; unsigned, as jose is stubbed here.
function mintToken(sub: string, role: 'user' | 'admin'): string {
  const now = Math.floor(Date.now() / 1000);
  return [
    segment({ alg: 'RS256', kid: 'integration-test-key', typ: 'JWT' }),
    segment({
      iss: ISSUER,
      sub,
      iat: now,
      exp: now + 3600,
      ...(role === 'admin' ? { 'cognito:groups': ['admin'] } : {}),
    }),
    'integration-test-signature',
  ].join('.');
}

// A bearer token JwtAuthGuard accepts and resolves to this Cognito sub.
export function authHeaders(
  sub: string,
  role: 'user' | 'admin' = 'user',
): Record<string, string> {
  return { Authorization: `Bearer ${mintToken(sub, role)}` };
}
