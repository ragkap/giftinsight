import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { writeQuery } from '@/lib/db-write';
import { env } from '@/lib/env';
import { newToken } from '@/lib/token';

export const runtime = 'nodejs';

const Body = z.object({ viewId: z.coerce.number().int().positive() });

type ParentRow = {
  view_id: number;
  recipient_first_name: string;
  recipient_last_name: string;
  recipient_email: string;
  gift_link_id: number;
  // Snapshot fields from the parent gift_link — preserved to keep the original
  // gifter's attribution + notification path intact across the chain.
  gifter_account_id: number;
  gifter_email: string;
  insight_id: number;
  insight_slug: string;
  insight_tagline: string;
  insight_author_account_id: number;
  insight_author_email: string;
  insight_author_name: string;
  parent_depth: number;
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const e = env();
  const { viewId } = parsed.data;

  // Pull the parent view + its gift_link in one round trip.
  const parent = (await writeQuery<ParentRow>(
    `SELECT v.id::bigint AS view_id,
            v.recipient_first_name, v.recipient_last_name, v.recipient_email,
            v.gift_link_id::bigint,
            l.gifter_account_id::bigint, l.gifter_email,
            l.insight_id::bigint, l.insight_slug, l.insight_tagline,
            l.insight_author_account_id::bigint, l.insight_author_email, l.insight_author_name,
            l.depth AS parent_depth
     FROM gift_views v
     JOIN gift_links l ON l.id = v.gift_link_id
     WHERE v.id = $1`,
    [viewId],
  ))[0];
  if (!parent) return NextResponse.json({ error: 'view_not_found' }, { status: 404 });

  // Pro-client recipients went through pro_redirect and never read inline;
  // they shouldn't be re-forwarding anything. (No state to enforce here
  // beyond a sanity check; the read flow already redirected them.)

  // How many forwards has this view already issued?
  const used = (await writeQuery<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM gift_links WHERE parent_view_id = $1`,
    [viewId],
  ))[0].n;

  const cap = e.REFORWARD_QUOTA_PER_VIEW;
  if (used >= cap) {
    return NextResponse.json({ error: 'quota_exceeded', used, cap }, { status: 429 });
  }

  // Forwarder display name — what the next recipient sees in the "Gifted by"
  // pill. Underlying attribution still rolls up to the original gifter.
  const forwarderName = `${parent.recipient_first_name} ${parent.recipient_last_name}`.trim();
  const token = newToken(22);
  const childMaxViews = e.REFORWARD_MAX_VIEWS_PER_LINK;
  const childExpiryDays = e.REFORWARD_EXPIRY_DAYS;

  const inserted = (await writeQuery<{ id: number; expires_at: string }>(
    `INSERT INTO gift_links (
       token, gifter_account_id, gifter_email, gifter_name,
       insight_id, insight_slug, insight_tagline,
       insight_author_account_id, insight_author_email, insight_author_name,
       max_views, expires_at,
       parent_view_id, parent_link_id, depth
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
             NOW() + make_interval(days => $12::int),
             $13,$14,$15)
     RETURNING id, expires_at`,
    [
      token,
      parent.gifter_account_id,
      parent.gifter_email,
      forwarderName,
      parent.insight_id,
      parent.insight_slug,
      parent.insight_tagline,
      parent.insight_author_account_id,
      parent.insight_author_email,
      parent.insight_author_name,
      childMaxViews,
      childExpiryDays,
      parent.view_id,
      parent.gift_link_id,
      (parent.parent_depth ?? 0) + 1,
    ],
  ))[0];

  const base = e.APP_BASE_URL.replace(/\/$/, '');
  return NextResponse.json({
    ok: true,
    id: inserted.id,
    token,
    url: `${base}/g/${token}`,
    expiresAt: inserted.expires_at,
    used: used + 1,
    cap,
    remaining: Math.max(0, cap - used - 1),
  });
}
