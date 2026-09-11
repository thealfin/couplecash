import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.SUPABASE_DB_URL_POOLED ||
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  '';

const client = postgres(connectionString || 'postgres://localhost:5432/postgres', { prepare: false });

export const db = drizzle(client, { schema });

export const APP_PRODUCTION_URL = 'https://couplecash-allfine.vercel.app';

