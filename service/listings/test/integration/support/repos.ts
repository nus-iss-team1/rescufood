import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import { AuditRepository } from '../../../src/audit/audit.repository';
import {
  DATABASE,
  DbModule,
  PG_POOL,
  type Database,
} from '../../../src/db/db.module';
import { ListingsRepository } from '../../../src/listings/listings.repository';
import { IdempotencyRepository } from '../../../src/requests/idempotency/idempotency.repository';
import { RequestsRepository } from '../../../src/requests/requests.repository';
import { databaseUrl } from './db';

export interface RepoContext {
  listings: ListingsRepository;
  requests: RequestsRepository;
  idempotency: IdempotencyRepository;
  audit: AuditRepository;
  db: Database;
  close: () => Promise<void>;
}

// The repositories wired through the real DbModule against the integration database.
export async function createRepoContext(): Promise<RepoContext> {
  process.env.DATABASE_URL = databaseUrl();

  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), DbModule],
    providers: [
      ListingsRepository,
      RequestsRepository,
      IdempotencyRepository,
      AuditRepository,
    ],
  }).compile();

  const app: INestApplication = moduleRef.createNestApplication({
    logger: false,
  });
  await app.init();

  const pool = app.get<Pool>(PG_POOL);

  return {
    listings: app.get(ListingsRepository),
    requests: app.get(RequestsRepository),
    idempotency: app.get(IdempotencyRepository),
    audit: app.get(AuditRepository),
    db: app.get<Database>(DATABASE),
    close: async () => {
      await app.close();
      await pool.end();
    },
  };
}
