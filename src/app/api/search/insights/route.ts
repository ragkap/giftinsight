import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllowedAuthorIds } from '@/lib/permissions';
import { getInsightBySlug, searchInsights, type InsightHit } from '@/lib/insights';

export const runtime = 'nodejs';

// Matches a Smartkarma insight URL in any reasonable form, e.g.:
//   https://www.smartkarma.com/insights/regis-resources-rrl-au...
//   smartkarma.com/insights/foo
//   /insights/foo
//   even just  insights/foo
const SLUG_RE = /(?:^|\/)insights\/([a-z0-9-]+)/i;

function extractSlug(q: string): string | null {
  const m = q.match(SLUG_RE);
  return m ? m[1].toLowerCase() : null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ results: [] });

  const allowed = await getAllowedAuthorIds(session.accountId, session.email);

  // URL-paste path: if the query looks like a Smartkarma insight URL, do a
  // slug lookup and return that single insight (or empty if the user isn't
  // allowed to gift its author).
  const slug = extractSlug(q);
  let results: InsightHit[];
  if (slug) {
    const hit = await getInsightBySlug(slug);
    if (!hit) {
      return NextResponse.json({ results: [], notice: 'insight_not_found' });
    }
    const isAllowedAuthor =
      allowed === null /* employee bypass */ ||
      allowed.includes(hit.author_account_id);
    if (!isAllowedAuthor) {
      return NextResponse.json({ results: [], notice: 'not_permitted' });
    }
    results = [hit];
  } else {
    results = await searchInsights({ q, allowedAuthorIds: allowed, limit: 25 });
  }

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
