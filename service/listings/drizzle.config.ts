import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Only schema.ts is scanned - external.schema.ts (organisations/users, owned
// by service/profile) is deliberately excluded so drizzle-kit never tries to
// manage those tables. See src/db/external.schema.ts for why.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
});
