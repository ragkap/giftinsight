import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'drizzle');
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is required'); process.exit(1); }

const client = new pg.Client({ connectionString: url, ssl: url.includes('railway') ? { rejectUnauthorized: false } : undefined });
await client.connect();
await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, run_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
const applied = new Set((await client.query('SELECT version FROM schema_migrations')).rows.map(r => r.version));
const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
for (const f of files) {
  if (applied.has(f)) { console.log(`skip ${f}`); continue; }
  const sql = readFileSync(join(dir, f), 'utf8');
  console.log(`applying ${f}…`);
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [f]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
}
await client.end();
console.log('migrations done');
