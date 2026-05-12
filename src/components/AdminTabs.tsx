'use client';
import { useState, useEffect } from 'react';

type TabId = 'activity' | 'overview';

const TABS: { id: TabId; label: string }[] = [
  { id: 'activity', label: 'Recent activity' },
  { id: 'overview', label: 'Overview' },
];

function readInitialTab(): TabId {
  if (typeof window === 'undefined') return 'activity';
  const fromHash = window.location.hash.replace(/^#/, '');
  if (fromHash === 'overview' || fromHash === 'activity') return fromHash;
  return 'activity';
}

export function AdminTabs({
  activity,
  overview,
}: {
  activity: React.ReactNode;
  overview: React.ReactNode;
}) {
  const [active, setActive] = useState<TabId>('activity');

  useEffect(() => {
    setActive(readInitialTab());
    const onHash = () => setActive(readInitialTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function select(id: TabId) {
    setActive(id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.hash = id;
      window.history.replaceState(null, '', url);
    }
  }

  return (
    <div>
      <div role="tablist" aria-label="Admin sections" className="border-b border-ink-100 mb-6 flex gap-1">
        {TABS.map((t) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              id={`tab-${t.id}`}
              onClick={() => select(t.id)}
              className={`relative px-4 py-2 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-t-md ${
                selected ? 'text-ink-900' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {t.label}
              {selected && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="panel-activity" aria-labelledby="tab-activity" hidden={active !== 'activity'}>
        {activity}
      </div>
      <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" hidden={active !== 'overview'}>
        {overview}
      </div>
    </div>
  );
}
