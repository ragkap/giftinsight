import 'server-only';
import { Pool, QueryResultRow } from 'pg';
import { env } from './env';

declare global {

  var __sk_write_pool: Pool | undefined;
}

function build() {
  const e = env();
  const url = e.DATABASE_URL;
  const ssl = /railway|render|amazonaws|heroku/.test(url) ? { rejectUnauthorized: false } : undefined;
  return new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    ssl,
  });
}

export const writePool: Pool = globalThis.__sk_write_pool ?? (globalThis.__sk_write_pool = build());

export async function writeQuery<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  const r = await writePool.query<T>(sql, params as never[]);
  return r.rows;
}
