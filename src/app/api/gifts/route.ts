import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { canGift } from '@/lib/permissions';
import { getInsightForGifting } from '@/lib/insights';
import { writeQuery } from '@/lib/db-write';
import { reserveQuotaSlot, getQuota } from '@/lib/quota';
import { newToken } from '@/lib/token';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

const Body = z.object({ insightId: z.coerce.number().int().positive() });

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rows = await writeQuery<{
    id: number; token: string; insight_id: number; insight_slug: string;
    insight_tagline: string; max_views: number; view_count: number;
    expires_at: string; created_at: string; insight_author_name: string;
  }>(
    `SELECT id, token, insight_id, insight_slug, insight_tagline, max_views, view_count,
            expires_at, created_at, insight_author_name
     FROM gift_links WHERE gifter_account_id = $1
     ORDER BY created_at DESC LIMIT 200`,
    [session.accountId],
  );

  const quota = await getQuota(session.accountId);
  const base = env().APP_BASE_URL.replace(/\/$/, '');
  return NextResponse.json({
    quota,
    links: rows.map((r) => ({
      id: r.id,
      token: r.token,
      url: `${base}/g/${r.token}`,
      insightId: r.insight_id,
      slug: r.insight_slug,
      tagline: r.insight_tagline,
      authorName: r.insight_author_name,
      maxViews: r.max_views,
      viewCount: r.view_count,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const insight = await getInsightForGifting(parsed.data.insightId);
  if (!insight) return NextResponse.json({ error: 'insight_not_found' }, { status: 404 });

  const allowed = await canGift(session.accountId, session.email, insight.account_id);
  if (!allowed) return NextResponse.json({ error: 'not_permitted' }, { status: 403 });

  const used = await reserveQuotaSlot(session.accountId);
  if (used === null) {
    const max = env().GIFT_MAX_LINKS_PER_GIFTER_PER_MONTH;
    return NextResponse.json({ error: 'quota_exceeded', max }, { status: 429 });
  }

  const e = env();
  const token = newToken(22);
  const maxViews = e.GIFT_MAX_VIEWS_PER_LINK;
  const expiryDays = e.GIFT_LINK_EXPIRY_DAYS;

  const rows = await writeQuery<{ id: number; expires_at: string }>(
    `INSERT INTO gift_links (
       token, gifter_account_id, gifter_email, gifter_name,
       insight_id, insight_slug, insight_tagline,
       insight_author_account_id, insight_author_email, insight_author_name,
       max_views, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW() + make_interval(days => $12::int))
     RETURNING id, expires_at`,
    [
      token,
      session.accountId,
      session.email,
      session.name ?? session.firstName ?? session.email,
      insight.id,
      insight.slug,
      insight.tagline,
      insight.account_id,
      insight.author_email,
      insight.author_name ?? insight.author_first_name ?? insight.author_email,
      maxViews,
      expiryDays,
    ],
  );

  const base = env().APP_BASE_URL.replace(/\/$/, '');
  return NextResponse.json({
    ok: true,
    id: rows[0].id,
    token,
    url: `${base}/g/${token}`,
    expiresAt: rows[0].expires_at,
    quotaUsed: used,
    quotaMax: e.GIFT_MAX_LINKS_PER_GIFTER_PER_MONTH,
  });
}
