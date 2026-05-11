'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { CheckIcon } from '@/components/icons';

type AuthorHit = { id: number; name: string; company: string | null };

export function RequestAccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<AuthorHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [sent, setSent] = useState<{ name: string; kind: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) { setQ(''); setHits([]); setSent(null); setError(null); }
  }, [open]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setHits([]); return; }
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search/authors?q=${encodeURIComponent(trimmed)}`, { signal: ac.signal });
        const j = await r.json();
        if (r.ok) setHits(j.results);
      } catch {}
      finally { setSearching(false); }
    }, 200);
    return () => { clearTimeout(t); ac.abort(); };
  }, [q]);

  function request(author: AuthorHit) {
    setError(null);
    start(async () => {
      const r = await fetch('/api/permission-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: author.id }),
      });
      const j = (await r.json().catch(() => null)) as { kind?: string; error?: string } | null;
      if (!r.ok) {
        setError(
          j?.error === 'cannot_request_self'
            ? "You can't request access from yourself."
            : 'Could not send the request. Please try again.',
        );
        return;
      }
      setSent({ name: author.name, kind: j?.kind ?? 'created' });
    });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-access-title"
      className="fixed inset-0 z-50 bg-ink-900/60 flex items-start md:items-center justify-center px-4 py-8 overflow-auto"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl ring-1 ring-accent/10 animate-gift-popup">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-4 h-8 w-8 rounded-full text-ink-400 hover:text-ink-900 hover:bg-ink-100 inline-flex items-center justify-center text-lg"
        >×</button>

        <div className="px-6 pt-6 pb-2">
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent font-semibold">Request access</div>
          <h2 id="request-access-title" className="mt-1 text-xl font-semibold text-ink-900">
            Ask an author to let you gift their insights
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            We'll email them a one-click approval link. Once they accept, you can gift any of their insights.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-ink-100">
          {sent ? (
            <div className="rounded-xl border border-accent/40 bg-accent-50 px-4 py-4 flex items-start gap-3">
              <div className="h-9 w-9 shrink-0 rounded-full bg-accent text-white inline-flex items-center justify-center">
                <CheckIcon size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-ink-900">
                  {sent.kind === 'already_pending'
                    ? `Already pending with ${sent.name}`
                    : sent.kind === 'already_approved'
                    ? `${sent.name} has already granted you access`
                    : `Request sent to ${sent.name}`}
                </div>
                <p className="mt-1 text-xs text-ink-600">
                  {sent.kind === 'already_approved'
                    ? "Try gifting one of their insights now — they're in your search results."
                    : "We've emailed them. You'll get an email if they approve."}
                </p>
                <button
                  onClick={() => { setSent(null); setQ(''); }}
                  className="mt-3 text-xs text-accent hover:underline"
                >
                  Request another →
                </button>
              </div>
            </div>
          ) : (
            <>
              <label className="block">
                <span className="text-xs font-medium text-ink-700">Search active Insight Providers</span>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name or email…"
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent outline-none"
                />
              </label>

              <div className="mt-3 min-h-[120px]">
                {q.trim().length < 2 && (
                  <div className="text-xs text-ink-500">Type at least 2 letters to search.</div>
                )}
                {q.trim().length >= 2 && searching && (
                  <div className="text-xs text-ink-500">Searching…</div>
                )}
                {q.trim().length >= 2 && !searching && hits.length === 0 && (
                  <div className="text-xs text-ink-500">No matching active Insight Providers.</div>
                )}
                {hits.length > 0 && (
                  <ul className="border border-ink-100 rounded-lg overflow-hidden divide-y divide-ink-100">
                    {hits.map((h) => (
                      <li key={h.id} className="px-3 py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0 text-sm text-ink-900 truncate">
                          {h.name}
                          {h.company && <span className="text-ink-500"> ({h.company})</span>}
                        </div>
                        <button
                          onClick={() => request(h)}
                          className="shrink-0 inline-flex items-center rounded-lg bg-accent text-white text-xs font-medium px-3 py-1.5 hover:bg-accent-600"
                        >
                          Request
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
