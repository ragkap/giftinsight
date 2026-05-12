'use client';
import { useEffect, useMemo, useState } from 'react';
import { fmtDate, fmtDateTime } from '@/lib/fmt';
import { LoadingRow } from '@/components/icons';

type Link = {
  id: number; token: string; insight_id: number; insight_slug: string;
  insight_tagline: string; max_views: number; view_count: number;
  expires_at: string; created_at: string; thanks_count: number; total_views: number;
};
type View = {
  id: number; recipient_first_name: string; recipient_last_name: string;
  recipient_email: string; thanked_at: string | null; viewed_at: string;
  is_pro_client: boolean;
};
type Reader = {
  recipient_email: string; recipient_first_name: string; recipient_last_name: string;
  reads: number; thanks: number; last_read: string;
};

export function Analytics() {
  const [data, setData] = useState<{ links: Link[]; topReaders: Reader[] } | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, View[]>>({});
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/analytics').then((r) => r.json()).then(setData);
  }, []);

  async function expand(id: number, token: string) {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    if (!details[id]) {
      const r = await fetch(`/api/gifts/${id}`);
      const j = await r.json();
      setDetails((d) => ({ ...d, [id]: j.views }));
    }
    void token;
  }

  async function copy(token: string, id: number) {
    const url = `${window.location.origin}/g/${token}`;
    try { await navigator.clipboard.writeText(url); setCopied(id); setTimeout(() => setCopied(null), 1500); }
    catch {}
  }

  if (!data) return <LoadingRow />;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-sm font-semibold text-ink-700 mb-3">Your gift links</h2>
        {data.links.length === 0 && <div className="text-sm text-ink-500">No gifts yet.</div>}
        <div className="bg-white border border-ink-100 rounded-xl shadow-soft overflow-hidden">
          {data.links.map((l) => {
            const expired = new Date(l.expires_at).getTime() < Date.now();
            const exhausted = l.view_count >= l.max_views;
            return (
              <div key={l.id} className="border-b border-ink-100 last:border-b-0">
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink-900 truncate">{l.insight_tagline}</div>
                    <div className="text-xs text-ink-500 mt-0.5">
                      {l.view_count}/{l.max_views} views · {l.thanks_count} thanks ·{' '}
                      {expired ? 'expired' : exhausted ? 'cap reached' : `expires ${fmtDate(l.expires_at)}`}
                    </div>
                  </div>
                  <button onClick={() => copy(l.token, l.id)} className="text-xs text-accent hover:underline shrink-0">
                    {copied === l.id ? 'Copied!' : 'Copy link'}
                  </button>
                  <button onClick={() => expand(l.id, l.token)} className="text-xs text-ink-500 hover:text-ink-900 shrink-0">
                    {open === l.id ? 'Hide' : 'Details'}
                  </button>
                </div>
                {open === l.id && (
                  <div className="px-4 pb-4">
                    {(details[l.id] ?? []).length === 0 ? (
                      <div className="text-xs text-ink-500">No views yet.</div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-ink-500 text-left">
                            <th className="font-medium pb-1">Recipient</th>
                            <th className="font-medium pb-1">Viewed</th>
                            <th className="font-medium pb-1">Thanked</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(details[l.id] ?? []).map((v) => (
                            <tr key={v.id} className="border-t border-ink-100">
                              <td className="py-1.5">
                                {v.recipient_first_name} {v.recipient_last_name}
                                {v.is_pro_client && <span className="ml-1 text-accent text-[10px]">(pro)</span>}
                              </td>
                              <td className="py-1.5 text-ink-500">{fmtDateTime(v.viewed_at)}</td>
                              <td className="py-1.5 text-ink-500">{v.thanked_at ? fmtDateTime(v.thanked_at) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <TopReaders readers={data.topReaders} />
    </div>
  );
}

type SortKey = 'name' | 'reads' | 'thanks' | 'last';

function TopReaders({ readers }: { readers: Reader[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('reads');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  function click(key: SortKey) {
    if (key === sortKey) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Sensible defaults: text ascending, numbers/dates descending.
      setDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  const sorted = useMemo(() => {
    const arr = [...readers];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        const an = `${a.recipient_first_name} ${a.recipient_last_name}`.toLowerCase();
        const bn = `${b.recipient_first_name} ${b.recipient_last_name}`.toLowerCase();
        cmp = an < bn ? -1 : an > bn ? 1 : 0;
      } else if (sortKey === 'reads') {
        cmp = a.reads - b.reads;
      } else if (sortKey === 'thanks') {
        cmp = a.thanks - b.thanks;
      } else {
        cmp = new Date(a.last_read).getTime() - new Date(b.last_read).getTime();
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [readers, sortKey, dir]);

  const headerCls = (key: SortKey) =>
    `font-medium px-4 py-2 cursor-pointer select-none hover:text-ink-900 ${
      sortKey === key ? 'text-ink-900' : ''
    }`;
  const arrow = (key: SortKey) =>
    sortKey === key ? <span className="ml-1 text-accent">{dir === 'asc' ? '↑' : '↓'}</span> : null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-ink-700 mb-3">Top readers</h2>
      {readers.length === 0 ? (
        <div className="text-sm text-ink-500">No reads yet.</div>
      ) : (
        <div className="bg-white border border-ink-100 rounded-xl shadow-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50">
              <tr className="text-ink-500 text-left">
                <th className={headerCls('name')}   onClick={() => click('name')}   role="button" aria-sort={sortKey === 'name'   ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>Reader{arrow('name')}</th>
                <th className={headerCls('reads')}  onClick={() => click('reads')}  role="button" aria-sort={sortKey === 'reads'  ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>Reads{arrow('reads')}</th>
                <th className={headerCls('thanks')} onClick={() => click('thanks')} role="button" aria-sort={sortKey === 'thanks' ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>Thanks{arrow('thanks')}</th>
                <th className={headerCls('last')}   onClick={() => click('last')}   role="button" aria-sort={sortKey === 'last'   ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>Last read{arrow('last')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {sorted.map((r) => (
                <tr key={r.recipient_email}>
                  <td className="px-4 py-2 text-ink-900">{r.recipient_first_name} {r.recipient_last_name}</td>
                  <td className="px-4 py-2 font-medium">{r.reads}</td>
                  <td className="px-4 py-2">{r.thanks}</td>
                  <td className="px-4 py-2 text-ink-500">{fmtDate(r.last_read)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
