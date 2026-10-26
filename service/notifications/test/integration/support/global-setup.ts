import { migrate } from './migrate';

// Migrates the externally-provided Postgres the whole run shares.
export default async function globalSetup(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  await migrate(url);
}
