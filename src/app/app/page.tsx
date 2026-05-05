import { getSession } from '@/lib/auth';
import { GiftSearch } from '@/components/GiftSearch';
import { writeQuery } from '@/lib/db-write';
import { env } from '@/lib/env';
import { getQuota } from '@/lib/quota';
import { RecentGifts, type RecentGift } from '@/components/RecentGifts';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AppHome() {
  const s = (await getSession())!;
  const quota = await getQuota(s.accountId);

  const recent = await writeQuery<RecentGift>(
    `SELECT l.id, l.token, l.insight_tagline, l.max_views, l.view_count, l.expires_at,
            COALESCE(SUM(CASE WHEN v.thanked_at IS NOT NULL THEN 1 ELSE 0 END), 0)::int AS thanks_count
     FROM gift_links l
     LEFT JOIN gift_views v ON v.gift_link_id = l.id
     WHERE l.gifter_account_id = $1
     GROUP BY l.id
     ORDER BY l.created_at DESC
     LIMIT 5`,
    [s.accountId],
  );

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-end justify-between gap-4 mb-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink-900">Search insights to gift</h1>
            <p className="text-sm text-ink-500 mt-1">
              Search by tagline, author, company name, or Bloomberg ticker. Last {env().INSIGHT_SEARCH_MAX_AGE_YEARS} years only.
              {s.isInsightProvider
                ? ' You can gift your own insights, plus any author who allows you to.'
                : ' You can gift insights from authors who have allowed you to.'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs uppercase tracking-wider text-ink-400">This month</div>
            <div className="text-sm font-medium text-ink-900">
              {quota.used} <span className="text-ink-400">/ {quota.max}</span> links
            </div>
          </div>
        </div>
        <GiftSearch />
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink-700 mb-3">Recent gifts</h2>
          <RecentGifts links={recent} />
          <div className="mt-3 text-right">
            <Link href="/app/analytics" className="text-xs text-accent hover:underline">View all & analytics →</Link>
          </div>
        </section>
      )}
    </div>
  );
}
