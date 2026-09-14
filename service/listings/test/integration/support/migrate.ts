import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';

const PROFILE_MIGRATIONS = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'profile',
  'db',
  'migrations',
);
const LISTINGS_MIGRATIONS = join(
  __dirname,
  '..',
  '..',
  '..',
  'db',
  'migrations',
);

async function golangMigrateFiles(dir: string): Promise<string[]> {
  const names = (await readdir(dir))
    .filter((name) => name.endsWith('.up.sql'))
    .sort();
  return Promise.all(names.map((name) => readFile(join(dir, name), 'utf8')));
}

async function drizzleMigrateStatements(dir: string): Promise<string[]> {
  const names = (await readdir(dir))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const statements: string[] = [];
  for (const name of names) {
    const sql = await readFile(join(dir, name), 'utf8');
    for (const part of sql.split('--> statement-breakpoint')) {
      const trimmed = part.trim();
      if (trimmed) statements.push(trimmed);
    }
  }
  return statements;
}

// Applies service/profile's migrations then service/listings' to a fresh database.
export async function migrate(connectionString: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    for (const sql of await golangMigrateFiles(PROFILE_MIGRATIONS)) {
      await client.query(sql);
    }
    for (const sql of await drizzleMigrateStatements(LISTINGS_MIGRATIONS)) {
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}
