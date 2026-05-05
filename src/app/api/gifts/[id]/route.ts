import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { writeQuery } from '@/lib/db-write';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const linkId = Number(id);
  if (!Number.isFinite(linkId)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const link = (await writeQuery<{
    id: number; token: string; insight_tagline: string; insight_slug: string;
    max_views: number; view_count: number; expires_at: string; created_at: string;
  }>(
    `SELECT id, token, insight_tagline, insight_slug, max_views, view_count, expires_at, created_at
     FROM gift_links WHERE id = $1 AND gifter_account_id = $2`,
    [linkId, session.accountId],
  ))[0];
  if (!link) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const views = await writeQuery<{
    id: number; recipient_first_name: string; recipient_last_name: string;
    recipient_email: string; thanked_at: string | null; viewed_at: string;
    is_pro_client: boolean;
  }>(
    `SELECT id, recipient_first_name, recipient_last_name, recipient_email,
            thanked_at, viewed_at, is_pro_client
     FROM gift_views WHERE gift_link_id = $1 ORDER BY viewed_at DESC`,
    [linkId],
  );

  return NextResponse.json({ link, views });
}
