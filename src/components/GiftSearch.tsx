'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { CheckIcon, GiftIcon } from '@/components/icons';
import { fmtDate } from '@/lib/fmt';
import { RequestAccessModal } from '@/components/RequestAccessModal';

type Result = {
  id: number;
  tagline: string;
  authorName: string;
  isOwn: boolean;
  entity: string | null;
  ticker: string | null;
  publishedAt: string | null;
};

export function GiftSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [giftingId, setGiftingId] = useState<number | null>(null);
  const [generated, setGenerated] = useState<{ url: string; tagline: string } | null>(null);
  const [recopied, setRecopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [, start] = useTransition();
  const abort = useRef<AbortController | null>(null);

  async function recopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setRecopied(true);
      setTimeout(() => setRecopied(false), 1600);
    } catch {}
  }

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) { setResults(null); setNotice(null); setLoading(false); return; }
    setLoading(true);
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search/insights?q=${encodeURIComponent(trimmed)}`, { signal: ac.signal });
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as { results: Result[]; notice?: string };
        setResults(j.results);
        setNotice(j.notice ?? null);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') { setResults([]); setNotice(null); }
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => { clearTimeout(t); ac.abort(); };
  }, [q]);

  function gift(insightId: number) {
    setError(null);
    setGiftingId(insightId);
    start(async () => {
      try {
        const r = await fetch('/api/gifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insightId }),
        });
        const j = await r.json();
        if (!r.ok) {
          setError(j?.error === 'quota_exceeded'
            ? `You've reached your monthly limit of ${j.max} gifted insights.`
            : j?.error === 'not_permitted'
            ? "This author hasn't allowed you to gift their insights."
            : 'Could not create a gift link.');
        } else {
          const tagline = results?.find((x) => x.id === insightId)?.tagline ?? '';
          setGenerated({ url: j.url, tagline });
          await navigator.clipboard.writeText(j.url).catch(() => {});
        }
      } finally {
        setGiftingId(null);
      }
    });
  }

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by tagline, author, company, ticker — or paste a smartkarma.com/insights URL"
          className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 pr-10 text-sm shadow-soft focus:border-accent outline-none"
          autoFocus
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-ink-400 hover:text-ink-900 hover:bg-ink-100 inline-flex items-center justify-center text-base"
          >
            ×
          </button>
        )}
      </div>

      {generated && (
        <div
          role="status"
          aria-live="polite"
          className="relative mt-4 rounded-xl border-2 border-accent bg-accent-50 px-5 py-4 shadow-soft animate-gift-popup"
        >
          <button
            onClick={() => setGenerated(null)}
            aria-label="Dismiss"
            className="absolute top-2 right-3 h-7 w-7 rounded-full text-ink-400 hover:text-ink-900 hover:bg-white/70 inline-flex items-center justify-center text-base"
          >
            ×
          </button>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-accent text-white inline-flex items-center justify-center shadow">
              <CheckIcon size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-ink-900">
                Copied to clipboard <span className="text-accent">✓</span>
              </div>
              <div className="text-xs text-ink-600 mt-0.5">
                Paste it anywhere — Slack, email, WhatsApp — to share this insight.
              </div>
            </div>
          </div>

          {generated.tagline && (
            <div className="mt-3 text-xs text-ink-500 truncate">{generated.tagline}</div>
          )}

          <div className="mt-3 flex items-center gap-2 rounded-lg bg-white border border-accent/30 px-3 py-2">
            <span className="text-[10px] uppercase tracking-wider text-ink-400 shrink-0">Link</span>
            <code className="text-[12px] text-ink-700 truncate flex-1">{generated.url}</code>
            <button
              onClick={() => recopy(generated.url)}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-700"
            >
              {recopied ? (<><CheckIcon size={13} /> Copied</>) : 'Copy again'}
            </button>
          </div>
        </div>
      )}

      {error && <div className="mt-3 text-xs text-red-600">{error}</div>}

      <div className="mt-4">
        {loading && <div className="text-xs text-ink-500">Searching…</div>}
        {results && results.length === 0 && !loading && (
          <div className="rounded-xl border border-ink-100 bg-white p-4 text-sm shadow-soft">
            {notice === 'insight_not_found' ? (
              <div className="text-ink-700">We couldn't find that insight on Smartkarma.</div>
            ) : (
              <>
                <div className="text-ink-900 font-medium">
                  {notice === 'not_permitted'
                    ? "You don't have permission to gift insights from this author yet."
                    : "No matching insights you're allowed to gift."}
                </div>
                <p className="mt-1 text-ink-600">
                  This is usually because the insight's author hasn't yet permitted you to gift
                  their work. Ask them — they can approve in one click.
                </p>
                <button
                  type="button"
                  onClick={() => setRequestOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-medium px-3 py-1.5 hover:bg-accent-600"
                >
                  Request access from an author
                </button>
              </>
            )}
          </div>
        )}
        <RequestAccessModal open={requestOpen} onClose={() => setRequestOpen(false)} />
        {results && results.length > 0 && (
          <ul className="bg-white border border-ink-100 rounded-xl shadow-soft divide-y divide-ink-100 overflow-hidden">
            {results.map((r) => (
              <li key={r.id} className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink-900">{r.tagline}</div>
                  <div className="text-xs text-ink-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>{r.authorName}{r.isOwn && ' (you)'}</span>
                    {r.entity && <span className="text-ink-400">·</span>}
                    {r.entity && <span>{r.entity}</span>}
                    {r.ticker && <span className="font-mono text-accent-700">{r.ticker}</span>}
                    {r.publishedAt && <><span className="text-ink-400">·</span><span>{fmtDate(r.publishedAt)}</span></>}
                  </div>
                </div>
                <button
                  onClick={() => gift(r.id)}
                  disabled={giftingId === r.id}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-xs font-medium px-3 py-1.5 hover:bg-accent-600 disabled:opacity-50"
                >
                  <GiftIcon size={13} className="text-white" />
                  {giftingId === r.id ? 'Creating…' : 'Gift'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
