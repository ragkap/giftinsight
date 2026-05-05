import 'server-only';
import { readQuery } from './db-read';
import { env } from './env';

export type InsightHit = {
  id: number;
  tagline: string;
  slug: string;
  published_at: Date | null;
  author_account_id: number;
  author_name: string | null;
  author_first_name: string | null;
  entity_name: string | null;
  bloomberg_ticker: string | null;
};

/**
 * Search across insight tagline (FTS via tsv) and primary entity name / bloomberg ticker.
 * Restricts to the supplied list of allowed author account_ids.
 */
export async function searchInsights(args: {
  q: string;
  /** `null` = no author restriction (Smartkarma employee). */
  allowedAuthorIds: number[] | null;
  limit?: number;
}): Promise<InsightHit[]> {
  const q = args.q.trim();
  if (!q) return [];
  if (args.allowedAuthorIds && args.allowedAuthorIds.length === 0) return [];
  const like = `%${q}%`;
  const limit = Math.min(args.limit ?? 25, 50);
  const maxAgeYears = env().INSIGHT_SEARCH_MAX_AGE_YEARS;

  if (args.allowedAuthorIds === null) {
    return await readQuery<InsightHit>(
      `SELECT i.id, i.tagline, i.slug, i.published_at,
              i.account_id  AS author_account_id,
              a.name        AS author_name,
              a.first_name  AS author_first_name,
              e.company_name AS entity_name,
              e.bloomberg_ticker
       FROM insights i
       JOIN accounts a ON a.id = i.account_id
       LEFT JOIN entities e ON e.id = i.primary_entity_id
       WHERE i.aasm_state = 'published'
         AND i.published_at >= NOW() - make_interval(years => $4::int)
         AND (
           i.tsv @@ websearch_to_tsquery('english', $1)
           OR i.tagline ILIKE $2
           OR a.name ILIKE $2
           OR a.first_name ILIKE $2
           OR e.company_name ILIKE $2
           OR e.bloomberg_ticker ILIKE $2
         )
       ORDER BY i.published_at DESC NULLS LAST
       LIMIT $3`,
      [q, like, limit, maxAgeYears],
    );
  }

  return await readQuery<InsightHit>(
    `SELECT i.id, i.tagline, i.slug, i.published_at,
            i.account_id  AS author_account_id,
            a.name        AS author_name,
            a.first_name  AS author_first_name,
            e.company_name AS entity_name,
            e.bloomberg_ticker
     FROM insights i
     JOIN accounts a ON a.id = i.account_id
     LEFT JOIN entities e ON e.id = i.primary_entity_id
     WHERE i.aasm_state = 'published'
       AND i.account_id = ANY($1::bigint[])
       AND i.published_at >= NOW() - make_interval(years => $5::int)
       AND (
         i.tsv @@ websearch_to_tsquery('english', $2)
         OR i.tagline ILIKE $3
         OR a.name ILIKE $3
         OR a.first_name ILIKE $3
         OR e.company_name ILIKE $3
         OR e.bloomberg_ticker ILIKE $3
       )
     ORDER BY i.published_at DESC NULLS LAST
     LIMIT $4`,
    [args.allowedAuthorIds, q, like, limit, maxAgeYears],
  );
}

export async function getInsightForGifting(insightId: number) {
  const rows = await readQuery<{
    id: number;
    tagline: string;
    slug: string;
    account_id: number;
    author_email: string;
    author_name: string | null;
    author_first_name: string | null;
  }>(
    `SELECT i.id, i.tagline, i.slug, i.account_id,
            a.email AS author_email,
            a.name AS author_name,
            a.first_name AS author_first_name
     FROM insights i
     JOIN accounts a ON a.id = i.account_id
     WHERE i.id = $1 AND i.aasm_state = 'published'`,
    [insightId],
  );
  return rows[0] ?? null;
}

export async function getInsightForReading(insightId: number) {
  const rows = await readQuery<{
    id: number;
    tagline: string;
    slug: string;
    executive_summary: string | null;
    detail: string | null;
    published_at: Date | null;
    author_account_id: number;
    author_name: string | null;
    author_first_name: string | null;
    author_email: string;
    entity_name: string | null;
    bloomberg_ticker: string | null;
  }>(
    `SELECT i.id, i.tagline, i.slug, i.executive_summary, i.detail, i.published_at,
            i.account_id AS author_account_id,
            a.name        AS author_name,
            a.first_name  AS author_first_name,
            a.email       AS author_email,
            e.company_name AS entity_name,
            e.bloomberg_ticker
     FROM insights i
     JOIN accounts a ON a.id = i.account_id
     LEFT JOIN entities e ON e.id = i.primary_entity_id
     WHERE i.id = $1 AND i.aasm_state = 'published'`,
    [insightId],
  );
  return rows[0] ?? null;
}

export async function searchAccountsByName(q: string, limit = 10) {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const like = `%${trimmed}%`;
  // Restrict to:
  //   (1) active Insight Providers — is_insight_provider=true AND has published
  //       at least one insight in the last 12 months (the insight_providers
  //       table's last_published_at column is stale, so we read the truth from
  //       the insights table).
  //   (2) active Professional clients — is_client=true, client_type='professional',
  //       accounts.activated=true (subscription_end_date is unreliable — many
  //       active clients have stale 2022-era end dates yet are still using SK).
  // Plus the standard locked/suspended/activated safety net.
  return await readQuery<{
    id: number;
    email: string;
    name: string | null;
    first_name: string | null;
    is_insight_provider: boolean;
    company_name: string | null;
  }>(
    `SELECT a.id, a.email, a.name, a.first_name, a.is_insight_provider,
            c.name AS company_name
     FROM accounts a
     LEFT JOIN companies c ON c.id = a.company_id
     WHERE a.locked_at IS NULL
       AND a.suspended_at IS NULL
       AND a.activated = TRUE
       AND a.email NOT ILIKE '%@smartkarma.com'
       AND (a.name ILIKE $1 OR a.first_name ILIKE $1 OR a.email ILIKE $1)
       AND (
         (a.is_insight_provider = TRUE AND EXISTS (
           SELECT 1 FROM insights i
           WHERE i.account_id = a.id
             AND i.aasm_state = 'published'
             AND i.published_at >= NOW() - INTERVAL '12 months'
         ))
         OR
         (a.is_client = TRUE AND a.client_type = 'professional')
       )
     ORDER BY (a.name IS NULL), a.name ASC
     LIMIT $2`,
    [like, Math.min(limit, 25)],
  );
}

export async function getAccountsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return await readQuery<{
    id: number;
    name: string | null;
    first_name: string | null;
    email: string;
    company_name: string | null;
  }>(
    `SELECT a.id, a.name, a.first_name, a.email, c.name AS company_name
     FROM accounts a
     LEFT JOIN companies c ON c.id = a.company_id
     WHERE a.id = ANY($1::bigint[])`,
    [ids],
  );
}
