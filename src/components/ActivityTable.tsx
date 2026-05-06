'use client';
import { useMemo, useState } from 'react';
import { fmtDateTime } from '@/lib/fmt';

export type ActivityKind = 'link_created' | 'view' | 'thanks' | 'trial_intent';

export type ActivityRow = {
  kind: ActivityKind;
  at: string;
  actor: string;
  detail: string;
};

const KIND_BADGE: Record<ActivityKind, { label: string; cls: string }> = {
  link_created: { label: 'GIFT',  cls: 'bg-accent-50 text-accent-700 border-accent/30' },
  view:         { label: 'READ',  cls: 'bg-ink-50 text-ink-700 border-ink-200' },
  thanks:       { label: 'THX',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  trial_intent: { label: 'TRIAL', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
};

type SortKey = 'kind' | 'actor' | 'detail' | 'at';

const KIND_ORDER: ActivityKind[] = ['link_created', 'view', 'thanks', 'trial_intent'];

export function ActivityTable({ rows }: { rows: ActivityRow[] }) {
  const [q, setQ] = useState('');
  const [activeKinds, setActiveKinds] = useState<Set<ActivityKind>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('at');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  function clickHeader(key: SortKey) {
    if (key === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setDir(key === 'at' ? 'desc' : 'asc');
    }
  }

  function toggleKind(k: ActivityKind) {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  const kindCounts = useMemo(() => {
    const counts: Record<ActivityKind, number> = {
      link_created: 0, view: 0, thanks: 0, trial_intent: 0,
    };
    for (const r of rows) counts[r.kind]++;
    return counts;
  }, [rows]);

  const filteredSorted = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (activeKinds.size > 0 && !activeKinds.has(r.kind)) return false;
      if (!needle) return true;
      return (
        r.actor.toLowerCase().includes(needle) ||
        r.detail.toLowerCase().includes(needle) ||
        KIND_BADGE[r.kind].label.toLowerCase().includes(needle) ||
        r.kind.toLowerCase().includes(needle)
      );
    });
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'kind')   cmp = a.kind.localeCompare(b.kind);
      else if (sortKey === 'actor')  cmp = a.actor.localeCompare(b.actor);
      else if (sortKey === 'detail') cmp = a.detail.localeCompare(b.detail);
      else cmp = new Date(a.at).getTime() - new Date(b.at).getTime();
      return dir === 'asc' ? cmp : -cmp;
    });
    return filtered;
  }, [rows, q, activeKinds, sortKey, dir]);

  const headerCls = (key: SortKey) =>
    `font-medium px-4 py-2 cursor-pointer select-none hover:text-ink-900 ${
      sortKey === key ? 'text-ink-900' : ''
    }`;
  const arrow = (key: SortKey) =>
    sortKey === key ? <span className="ml-1 text-accent">{dir === 'asc' ? '↑' : '↓'}</span> : null;

  const filterActive = q.trim().length > 0 || activeKinds.size > 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {KIND_ORDER.map((k) => {
          const badge = KIND_BADGE[k];
          const active = activeKinds.has(k);
          const count = kindCounts[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggleKind(k)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wider transition ${
                active
                  ? `${badge.cls} ring-2 ring-offset-1 ring-accent/40`
                  : `${badge.cls} opacity-70 hover:opacity-100`
              }`}
            >
              <span>{badge.label}</span>
              <span className="font-semibold opacity-80 tabular-nums">{count}</span>
            </button>
          );
        })}
        {activeKinds.size > 0 && (
          <button
            type="button"
            onClick={() => setActiveKinds(new Set())}
            className="text-[11px] text-ink-500 hover:text-ink-900 underline underline-offset-2 ml-1"
          >
            Clear types
          </button>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by name, action, or detail…"
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 pr-9 text-sm focus:border-accent outline-none"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="Clear filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full text-ink-400 hover:text-ink-900 hover:bg-ink-100 inline-flex items-center justify-center text-base"
            >
              ×
            </button>
          )}
        </div>
        <div className="text-xs text-ink-500 tabular-nums shrink-0">
          {filteredSorted.length}{filterActive && ` of ${rows.length}`} events
        </div>
      </div>

      <div className="bg-white border border-ink-100 rounded-xl shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50">
            <tr className="text-ink-500 text-left">
              <th className={headerCls('kind')}   onClick={() => clickHeader('kind')}   role="button" aria-sort={sortKey === 'kind'   ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>Type{arrow('kind')}</th>
              <th className={headerCls('actor')}  onClick={() => clickHeader('actor')}  role="button" aria-sort={sortKey === 'actor'  ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>Actor{arrow('actor')}</th>
              <th className={headerCls('detail')} onClick={() => clickHeader('detail')} role="button" aria-sort={sortKey === 'detail' ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>Detail{arrow('detail')}</th>
              <th className={headerCls('at')}     onClick={() => clickHeader('at')}     role="button" aria-sort={sortKey === 'at'     ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>When{arrow('at')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {filteredSorted.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-ink-500" colSpan={4}>
                  {filterActive ? 'No matching events.' : 'No activity yet.'}
                </td>
              </tr>
            )}
            {filteredSorted.map((r, i) => {
              const badge = KIND_BADGE[r.kind];
              return (
                <tr key={i} className="align-top">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wider ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-ink-900 whitespace-nowrap">{r.actor}</td>
                  <td className="px-4 py-2 text-ink-700">{r.detail}</td>
                  <td className="px-4 py-2 text-ink-500 text-xs whitespace-nowrap">{fmtDateTime(r.at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
