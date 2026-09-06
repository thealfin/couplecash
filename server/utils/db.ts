import pg from 'pg'

const connectionString =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:secretpassword@localhost:5432/couplecash'

const g = globalThis as unknown as { __pgPool?: pg.Pool }

export const pool: pg.Pool =
  g.__pgPool ??
  new pg.Pool({
    connectionString,
    max: 10,
  })

if (import.meta.dev) g.__pgPool = pool

