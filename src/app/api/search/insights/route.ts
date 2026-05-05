import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllowedAuthorIds } from '@/lib/permissions';
import { searchInsights } from '@/lib/insights';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ results: [] });

  const allowed = await getAllowedAuthorIds(session.accountId, session.email);
  const results = await searchInsights({ q, allowedAuthorIds: allowed, limit: 25 });

  return NextResponse.json({
    results: results.map((r) => ({
      id: r.id,
      tagline: r.tagline,
      slug: r.slug,
      publishedAt: r.published_at,
      authorId: r.author_account_id,
      authorName: r.author_name ?? r.author_first_name ?? 'Unknown',
      isOwn: r.author_account_id === session.accountId,
      entity: r.entity_name,
      ticker: r.bloomberg_ticker,
    })),
  });
}
