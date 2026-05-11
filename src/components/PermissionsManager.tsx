'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { fmtDate } from '@/lib/fmt';

type State = {
  openToAll: boolean;
  grants: { id: number; name: string; company: string | null; createdAt: string }[];
};
type UserHit = { id: number; name: string; company: string | null; isInsightProvider: boolean };
type IncomingRequest = { id: number; gifterId: number; gifterName: string; gifterCompany: string | null; createdAt: string };

export function PermissionsManager() {
  const [state, setState] = useState<State | null>(null);
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<UserHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [, start] = useTransition();
  const abort = useRef<AbortController | null>(null);

  async function load() {
    const [r1, r2] = await Promise.all([
      fetch('/api/permissions'),
      fetch('/api/permission-requests'),
    ]);
    if (r1.ok) setState(await r1.json());
    if (r2.ok) {
      const j = (await r2.json()) as { incoming: IncomingRequest[] };
      setRequests(j.incoming ?? []);
    }
  }
  useEffect(() => { void load(); }, []);

  function respond(requestId: number, action: 'approve' | 'deny') {
    start(async () => {
      await fetch(`/api/permission-requests/${requestId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await load();
    });
  }

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
      {requests.length > 0 && (
        <div className="rounded-xl border-2 border-accent bg-accent-50 p-4 shadow-soft">
          <div className="text-[11px] uppercase tracking-wider text-accent font-semibold">
            Pending requests ({requests.length})
          </div>
          <p className="mt-1 text-sm text-ink-700">
            These people would like permission to gift your insights. Approving adds them
            to your list below; they're emailed either way.
          </p>
          <ul className="mt-3 divide-y divide-accent/20 rounded-lg border border-accent/20 bg-white">
            {requests.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink-900 truncate">
                    {r.gifterName}
                    {r.gifterCompany && <span className="text-ink-500"> ({r.gifterCompany})</span>}
                  </div>
                  <div className="text-xs text-ink-400 mt-0.5">Asked {fmtDate(r.createdAt)}</div>
                </div>
                <button
                  onClick={() => respond(r.id, 'deny')}
                  className="text-xs text-ink-500 hover:text-red-600"
                >
                  Deny
                </button>
                <button
                  onClick={() => respond(r.id, 'approve')}
                  className="inline-flex items-center rounded-lg bg-accent text-white text-xs font-medium px-3 py-1.5 hover:bg-accent-600"
                >
                  Approve
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-accent/30 bg-accent-50/50 p-4 flex items-start gap-3">
        <span className="inline-block h-2 w-2 rounded-full bg-accent mt-1.5" />
        <div className="text-sm text-ink-800">
          <strong className="text-ink-900">Smartkarma employees</strong> can always gift your insights.
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
                  <div className="min-w-0 text-sm text-ink-900 truncate">
                    {h.name}
                    {h.company && <span className="text-ink-500"> ({h.company})</span>}
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
                <div className="text-sm text-ink-900 truncate">
                  {g.name}
                  {g.company && <span className="text-ink-500"> ({g.company})</span>}
                </div>
                <div className="text-xs text-ink-400 mt-0.5">Granted {fmtDate(g.createdAt)}</div>
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
