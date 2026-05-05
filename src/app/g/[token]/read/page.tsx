import { writeQuery } from '@/lib/db-write';
import { getInsightForReading } from '@/lib/insights';
import { sanitizeInsightHtml } from '@/lib/sanitize';
import { getTrending } from '@/lib/trending';
import { env } from '@/lib/env';
import { Reader } from '@/components/Reader';

export const dynamic = 'force-dynamic';

type Q = {
  v?: string;  // viewId
  i?: string;  // insightId
  rc?: string; // readCount
  long?: string;
  g?: string;  // gifter name
};

type LinkRow = { id: number; insight_id: number; insight_tagline: string; insight_author_name: string };

export default async function ReadPage({
  params, searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Q>;
}) {
  const { token } = await params;
  const sp = await searchParams;

  const link = (await writeQuery<LinkRow>(
    `SELECT id, insight_id, insight_tagline, insight_author_name FROM gift_links WHERE token = $1`,
    [token],
  ))[0];
  if (!link) {
    return <main className="min-h-screen flex items-center justify-center text-ink-500">This gift link could not be found.</main>;
  }

  const insight = await getInsightForReading(link.insight_id);
  if (!insight) {
    return <main className="min-h-screen flex items-center justify-center text-ink-500">This insight is no longer available.</main>;
  }

  const trending = await getTrending();

  return (
    <Reader
      tagline={insight.tagline}
      authorName={insight.author_name ?? insight.author_first_name ?? 'Smartkarma Insight Provider'}
      publishedAt={insight.published_at?.toISOString() ?? null}
      entityName={insight.entity_name}
      ticker={insight.bloomberg_ticker}
      executiveSummaryHtml={sanitizeInsightHtml(insight.executive_summary)}
      detailHtml={sanitizeInsightHtml(insight.detail)}
      gifterName={sp.g ?? 'A Smartkarma user'}
      viewId={sp.v ? Number(sp.v) : 0}
      readCount={sp.rc ? Number(sp.rc) : 1}
      showLongReaderModal={sp.long === '1'}
      thanksThreshold={env().RECIPIENT_THANKS_MODAL_THRESHOLD}
      trending={trending}
    />
  );
}
