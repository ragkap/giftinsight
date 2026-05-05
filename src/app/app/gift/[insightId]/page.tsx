// Direct deep-link entry to gift a known insight id (rarely used; main flow is via search).
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { canGift } from '@/lib/permissions';
import { getInsightForGifting } from '@/lib/insights';

export const dynamic = 'force-dynamic';

export default async function GiftDeepLink({ params }: { params: Promise<{ insightId: string }> }) {
  const s = await getSession();
  if (!s) redirect('/login');
  const { insightId } = await params;
  const id = Number(insightId);
  if (!Number.isFinite(id)) redirect('/app');
  const insight = await getInsightForGifting(id);
  if (!insight) redirect('/app');
  const allowed = await canGift(s.accountId, s.email, insight.account_id);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-ink-900">Gift this insight</h1>
      <p className="mt-1 text-sm text-ink-500">By {insight.author_name ?? insight.author_first_name ?? 'Unknown'}</p>
      <div className="mt-4 bg-white border border-ink-100 rounded-xl shadow-soft p-4">
        <div className="text-sm text-ink-900">{insight.tagline}</div>
      </div>
      {!allowed ? (
        <div className="mt-4 text-sm text-red-600">You don't have permission to gift this author's insights.</div>
      ) : (
        <form action="/api/gifts" method="POST" className="mt-4">
          <input type="hidden" name="insightId" value={insight.id} />
          <p className="text-xs text-ink-500">Use the search on the dashboard to create a gift link in one click.</p>
        </form>
      )}
    </div>
  );
}
