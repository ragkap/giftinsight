import 'server-only';
import { writeQuery } from './db-write';
import { env } from './env';

function ym(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export type QuotaInfo = { used: number; max: number; remaining: number; yearMonth: string };

export async function getQuota(gifterId: number): Promise<QuotaInfo> {
  const max = env().GIFT_MAX_LINKS_PER_GIFTER_PER_MONTH;
  const yearMonth = ym();
  const rows = await writeQuery<{ links_created: number }>(
    `SELECT links_created FROM monthly_link_quota WHERE gifter_account_id = $1 AND year_month = $2`,
    [gifterId, yearMonth],
  );
  const used = rows[0]?.links_created ?? 0;
  return { used, max, remaining: Math.max(0, max - used), yearMonth };
}

/** Atomically reserves one quota slot. Returns the new used count, or null if over cap. */
export async function reserveQuotaSlot(gifterId: number): Promise<number | null> {
  const max = env().GIFT_MAX_LINKS_PER_GIFTER_PER_MONTH;
  const yearMonth = ym();
  const rows = await writeQuery<{ links_created: number }>(
    `INSERT INTO monthly_link_quota (gifter_account_id, year_month, links_created)
     VALUES ($1, $2, 1)
     ON CONFLICT (gifter_account_id, year_month) DO UPDATE
       SET links_created = monthly_link_quota.links_created + 1
       WHERE monthly_link_quota.links_created < $3
     RETURNING links_created`,
    [gifterId, yearMonth, max],
  );
  return rows[0]?.links_created ?? null;
}
