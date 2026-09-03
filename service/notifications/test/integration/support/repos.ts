import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Pool } from 'pg';
import { DbModule, PG_POOL } from '../../../src/db/db.module';
import { MailerService } from '../../../src/notifications/mailer.service';
import { NotificationsRepository } from '../../../src/notifications/notifications.repository';
import { SqsConsumerService } from '../../../src/notifications/sqs-consumer.service';
import { databaseUrl } from './db';

function setEnv(): void {
  process.env.DATABASE_URL = databaseUrl();
  process.env.AWS_REGION ??= 'ap-southeast-1';
  process.env.NOTIFICATION_QUEUE_URL ??= 'https://sqs.test/queue';
  process.env.GMAIL_USER ??= 'noreply@example.org';
  process.env.GMAIL_APP_PASSWORD ??= 'test-password';
}

export interface RepoContext {
  repository: NotificationsRepository;
  consumer: SqsConsumerService;
  mailer: { send: jest.Mock };
  pool: Pool;
  close: () => Promise<void>;
}

// The repository and SQS consumer wired through the real DbModule against the
// integration database. The mailer is a spy - process() never sends real mail.
export async function createRepoContext(): Promise<RepoContext> {
  setEnv();

  const mailer = { send: jest.fn().mockResolvedValue(undefined) };

  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), DbModule],
    providers: [
      NotificationsRepository,
      SqsConsumerService,
      { provide: MailerService, useValue: mailer },
    ],
  }).compile();

  // No app.init(): SqsConsumerService.onModuleInit (the SQS poll loop) never runs.
  const pool = moduleRef.get<Pool>(PG_POOL);

  return {
    repository: moduleRef.get(NotificationsRepository),
    consumer: moduleRef.get(SqsConsumerService),
    mailer,
    pool,
    close: async () => {
      await moduleRef.close();
      await pool.end();
    },
  };
}
