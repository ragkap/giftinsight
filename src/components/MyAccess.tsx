'use client';
import { useEffect, useState } from 'react';
import { fmtDate } from '@/lib/fmt';
import { RequestAccessModal } from '@/components/RequestAccessModal';
import { CheckIcon, LoadingRow } from '@/components/icons';

type AccessAuthor = {
  id: number;
  name: string;
  company: string | null;
  via: 'open_to_all' | 'specific';
  grantedAt: string | null;
};

type AccessResponse = {
  isStaff: boolean;
  isInsightProvider?: boolean;
  authors: AccessAuthor[];
};

export function MyAccess() {
  const [data, setData] = useState<AccessResponse | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    fetch('/api/my-access').then((r) => r.json()).then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <LoadingRow />;

  if (data.isStaff) {
    return (
      <div className="rounded-2xl border-2 border-accent bg-accent-50 p-6 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-accent text-white inline-flex items-center justify-center shrink-0">
            <CheckIcon size={22} className="text-white" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-accent font-semibold">
              Smartkarma staff
            </div>
            <h2 className="mt-1 text-lg font-semibold text-ink-900">
              You can gift any insight on Smartkarma.
            </h2>
            <p className="mt-1 text-sm text-ink-700">
              As a member of Smartkarma staff, you don't need per-author permission —
              every active Insight Provider is automatically gift-able from your
              search box.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const specific = data.authors.filter((a) => a.via === 'specific');
  const openToAll = data.authors.filter((a) => a.via === 'open_to_all');

  return (
    <div className="space-y-6">
      {data.isInsightProvider && (
        <div className="rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-800 shadow-soft">
          <strong className="text-ink-900">You can always gift your own insights.</strong>{' '}
          They're in your search results by default.
        </div>
      )}

      <Section title={`Authors who have granted you specifically (${specific.length})`}>
        {specific.length === 0 ? (
          <Empty>
            No individual grants yet. Authors can permission you directly, or you can
            ask one — see below.
          </Empty>
        ) : (
          <List>
            {specific.map((a) => (
              <li key={a.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink-900 truncate">
                    {a.name}
                    {a.company && <span className="text-ink-500"> ({a.company})</span>}
                  </div>
                  {a.grantedAt && (
                    <div className="text-xs text-ink-400 mt-0.5">Granted {fmtDate(a.grantedAt)}</div>
                  )}
                </div>
              </li>
            ))}
          </List>
        )}
      </Section>

      <Section title={`Authors who have opened gifting to everyone (${openToAll.length})`}>
        {openToAll.length === 0 ? (
          <Empty>None right now.</Empty>
        ) : (
          <List>
            {openToAll.map((a) => (
              <li key={a.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0 text-sm text-ink-900 truncate">
                  {a.name}
                  {a.company && <span className="text-ink-500"> ({a.company})</span>}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-accent font-bold border border-accent/30 bg-accent-50 rounded-full px-2 py-0.5">
                  Open to all
                </span>
              </li>
            ))}
          </List>
        )}
      </Section>

      <div className="rounded-xl border border-accent/30 bg-accent-50/50 p-4 flex items-center justify-between gap-3">
        <div className="text-sm text-ink-800">
          Want to gift another author's insights? Ask them — most approve in seconds.
        </div>
        <button
          onClick={() => setRequestOpen(true)}
          className="shrink-0 inline-flex items-center rounded-lg bg-accent text-white text-xs font-medium px-3 py-1.5 hover:bg-accent-600"
        >
          Request access
        </button>
      </div>

      <RequestAccessModal open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-ink-700 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return (
    <ul className="bg-white border border-ink-100 rounded-xl shadow-soft divide-y divide-ink-100">
      {children}
    </ul>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-500 shadow-soft">
      {children}
    </div>
  );
}
