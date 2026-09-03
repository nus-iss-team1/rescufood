import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';

const MIGRATIONS_DIR = join(__dirname, '..', '..', '..', 'db', 'migrations');

async function statements(dir: string): Promise<string[]> {
  const names = (await readdir(dir)).filter((n) => n.endsWith('.sql')).sort();
  const out: string[] = [];
  for (const name of names) {
    const sql = await readFile(join(dir, name), 'utf8');
    for (const part of sql.split('--> statement-breakpoint')) {
      const trimmed = part.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
}

// Applies this service's migrations to a fresh database. The notifications
// schema is self-contained - no cross-service tables or FKs.
export async function migrate(connectionString: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    for (const sql of await statements(MIGRATIONS_DIR)) {
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}
