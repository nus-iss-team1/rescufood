import { rmSync } from 'node:fs';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { CONTAINER_GLOBAL, DATABASE_URL_FILE } from './db';

export default async function globalTeardown(): Promise<void> {
  const container = (globalThis as Record<string, unknown>)[
    CONTAINER_GLOBAL
  ] as StartedPostgreSqlContainer | undefined;
  await container?.stop();
  rmSync(DATABASE_URL_FILE, { force: true });
}
