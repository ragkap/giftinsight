'use client';

import { useState } from 'react';
import { Spinner } from '@/components/icons';

type Table = 'gifters' | 'authors' | 'recipients' | 'activity' | 'links' | 'views';

export function ExportCsvButton({ table, label = 'Export CSV' }: { table: Table; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/export?table=${encodeURIComponent(table)}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const disp = res.headers.get('content-disposition') ?? '';
      const m = /filename="([^"]+)"/.exec(disp);
      const filename = m?.[1] ?? `gift-insight-${table}.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border border-ink-200 text-ink-700 bg-white hover:bg-ink-50 hover:border-ink-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
        title={`Download all rows as CSV`}
      >
        {busy ? (
          <Spinner size={13} />
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
        {busy ? 'Exporting…' : label}
      </button>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </div>
  );
}
