import 'server-only';
import { Pool, QueryResultRow } from 'pg';
import { env } from './env';

declare global {

  var __sk_read_pool: Pool | undefined;
}

function build() {
  const e = env();
  return new Pool({
    host: e.READ_DB_HOST,
    port: e.READ_DB_PORT,
    database: e.READ_DB_NAME,
    user: e.READ_DB_USER,
    password: e.READ_DB_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    statement_timeout: 8_000,
    ssl: { rejectUnauthorized: false },
  });
}

// Lazy: never construct (or validate env) at module load — Next 16's
// page-data collection imports this file before runtime env is available.
function pool(): Pool {
  if (!globalThis.__sk_read_pool) globalThis.__sk_read_pool = build();
  return globalThis.__sk_read_pool;
}

export async function readQuery<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  const r = await pool().query<T>(sql, params as never[]);
  return r.rows;
}
