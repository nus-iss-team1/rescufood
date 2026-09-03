import { writeFileSync } from 'node:fs';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from './migrate';
import { CONTAINER_GLOBAL, DATABASE_URL_FILE } from './db';

// Starts and migrates the Postgres container the whole run shares.
export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgres:17-alpine').start();
  const url = container.getConnectionUri();

  await migrate(url);

  (globalThis as Record<string, unknown>)[CONTAINER_GLOBAL] = container;
  writeFileSync(DATABASE_URL_FILE, url);
}
