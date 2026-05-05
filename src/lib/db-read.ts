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

export const readPool: Pool = globalThis.__sk_read_pool ?? (globalThis.__sk_read_pool = build());

export async function readQuery<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  const r = await readPool.query<T>(sql, params as never[]);
  return r.rows;
}
