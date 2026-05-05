'use client';
import { useEffect, useRef, useState, useTransition } from 'react';

type State = {
  openToAll: boolean;
  grants: { id: number; name: string; email: string; createdAt: string }[];
};
type UserHit = { id: number; name: string; email: string; isInsightProvider: boolean };

export function PermissionsManager() {
  const [state, setState] = useState<State | null>(null);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<UserHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [, start] = useTransition();
  const abort = useRef<AbortController | null>(null);

  async function load() {
    const r = await fetch('/api/permissions');
    if (r.ok) setState(await r.json());
  }
  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setHits([]); return; }
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search/users?q=${encodeURIComponent(trimmed)}`, { signal: ac.signal });
        const j = await r.json();
        if (r.ok) setHits(j.results);
      } catch {}
      finally { setSearching(false); }
    }, 200);
    return () => { clearTimeout(t); ac.abort(); };
  }, [q]);

  function toggleOpen(openToAll: boolean) {
    start(async () => {
      await fetch('/api/permissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', openToAll }),
      });
      await load();
    });
  }

  function grant(gifterId: number) {
    start(async () => {
      await fetch('/api/permissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'grant', gifterId }),
      });
      setQ(''); setHits([]);
      await load();
    });
  }

  function revoke(gifterId: number) {
    start(async () => {
      await fetch('/api/permissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', gifterId }),
      });
      await load();
    });
  }

  if (!state) return <div className="text-sm text-ink-500">Loading…</div>;

  const specificDisabled = state.openToAll;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-accent/30 bg-accent-50/50 p-4 flex items-start gap-3">
        <span className="inline-block h-2 w-2 rounded-full bg-accent mt-1.5" />
        <div className="text-sm text-ink-800">
          <strong className="text-ink-900">Smartkarma employees</strong> can always gift your insights.
          This applies to anyone signed in with an <code className="text-[12px] bg-white border border-ink-100 px-1 py-0.5 rounded">@smartkarma.com</code> email.
        </div>
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-soft flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-ink-900">Allow anyone to gift my insights</div>
          <div className="text-xs text-ink-500 mt-0.5">When on, every Smartkarma user can gift your insights.</div>
        </div>
        <button
          onClick={() => toggleOpen(!state.openToAll)}
          className={`relative h-6 w-11 rounded-full transition ${state.openToAll ? 'bg-accent' : 'bg-ink-200'}`}
          aria-pressed={state.openToAll}
        >
          <span className={`absolute top-0.5 ${state.openToAll ? 'left-5' : 'left-0.5'} h-5 w-5 rounded-full bg-white shadow transition-all`} />
        </button>
      </div>

      <div className={`rounded-xl border border-ink-100 bg-white p-4 shadow-soft transition ${specificDisabled ? 'opacity-50 pointer-events-none select-none' : ''}`}
           aria-disabled={specificDisabled}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-ink-900">Grant a specific person</div>
          {specificDisabled && (
            <span className="text-[11px] uppercase tracking-wider text-ink-400">Disabled — anyone can gift</span>
          )}
        </div>
        <div className="mt-3 relative">
          <input
            type="text" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email…"
            disabled={specificDisabled}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent outline-none disabled:bg-ink-50"
          />
          {!specificDisabled && (searching || hits.length > 0) && q.trim().length >= 2 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-ink-100 rounded-lg shadow-soft overflow-hidden">
              {searching && <div className="px-3 py-2 text-xs text-ink-500">Searching…</div>}
              {!searching && hits.length === 0 && <div className="px-3 py-2 text-xs text-ink-500">No matches.</div>}
              {hits.map((h) => (
                <button key={h.id} onClick={() => grant(h.id)}
                  className="w-full text-left px-3 py-2 hover:bg-ink-50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-ink-900 truncate">{h.name}</div>
                    <div className="text-xs text-ink-500 truncate">{h.email}</div>
                  </div>
                  <span className="text-xs text-accent font-medium shrink-0">Grant</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`rounded-xl border border-ink-100 bg-white shadow-soft overflow-hidden transition ${specificDisabled ? 'opacity-50 pointer-events-none select-none' : ''}`}>
        <div className="px-4 py-3 border-b border-ink-100 text-sm font-medium text-ink-900">
          People allowed to gift your insights ({state.grants.length})
        </div>
        {state.grants.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-ink-500">No specific grants yet.</div>
        )}
        <ul className="divide-y divide-ink-100">
          {state.grants.map((g) => (
            <li key={g.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink-900 truncate">{g.name}</div>
                <div className="text-xs text-ink-500 truncate">{g.email}</div>
              </div>
              <button onClick={() => revoke(g.id)} disabled={specificDisabled}
                className="text-xs text-ink-500 hover:text-red-600 disabled:hover:text-ink-300">Revoke</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
