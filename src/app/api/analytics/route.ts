import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { writeQuery } from '@/lib/db-write';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const links = await writeQuery<{
    id: number; token: string; insight_id: number; insight_slug: string;
    insight_tagline: string; max_views: number; view_count: number;
    expires_at: string; created_at: string;
    thanks_count: number; total_views: number;
  }>(
    `SELECT l.id, l.token, l.insight_id, l.insight_slug, l.insight_tagline,
            l.max_views, l.view_count, l.expires_at, l.created_at,
            COALESCE(SUM(CASE WHEN v.thanked_at IS NOT NULL THEN 1 ELSE 0 END),0)::int AS thanks_count,
            COUNT(v.id)::int AS total_views
     FROM gift_links l
     LEFT JOIN gift_views v ON v.gift_link_id = l.id
     WHERE l.gifter_account_id = $1
     GROUP BY l.id
     ORDER BY l.created_at DESC
     LIMIT 200`,
    [session.accountId],
  );

  const topReaders = await writeQuery<{
    recipient_email: string; recipient_first_name: string; recipient_last_name: string;
    reads: number; thanks: number; last_read: string;
  }>(
    `SELECT v.recipient_email,
            MAX(v.recipient_first_name) AS recipient_first_name,
            MAX(v.recipient_last_name)  AS recipient_last_name,
            COUNT(*)::int AS reads,
            SUM(CASE WHEN v.thanked_at IS NOT NULL THEN 1 ELSE 0 END)::int AS thanks,
            MAX(v.viewed_at) AS last_read
     FROM gift_views v
     JOIN gift_links l ON l.id = v.gift_link_id
     WHERE l.gifter_account_id = $1
     GROUP BY v.recipient_email
     ORDER BY reads DESC, last_read DESC
     LIMIT 25`,
    [session.accountId],
  );

  return NextResponse.json({ links, topReaders });
}
