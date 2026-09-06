import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL_POOLED || '',
  },
  verbose: true,
  strict: true,
});
