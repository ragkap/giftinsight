'use client';
import Link from 'next/link';
import { useState } from 'react';

export type RecentGift = {
  id: number;
  token: string;
  insight_tagline: string;
  max_views: number;
  view_count: number;
  thanks_count: number;
  expires_at: string;
};

export function RecentGifts({ links }: { links: RecentGift[] }) {
  const [copied, setCopied] = useState<number | null>(null);

  async function copy(token: string, id: number) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/g/${token}`);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  if (links.length === 0) return null;

  return (
    <div className="bg-white border border-ink-100 rounded-xl shadow-soft overflow-hidden">
      {links.map((l) => {
        const expired = new Date(l.expires_at).getTime() < Date.now();
        const exhausted = l.view_count >= l.max_views;
        return (
          <div key={l.id} className="border-b border-ink-100 last:border-b-0">
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink-900 truncate">{l.insight_tagline}</div>
                <div className="text-xs text-ink-500 mt-0.5">
                  {l.view_count}/{l.max_views} views · {l.thanks_count} thanks ·{' '}
                  {expired ? 'expired' : exhausted ? 'cap reached' : `expires ${new Date(l.expires_at).toLocaleDateString()}`}
                </div>
              </div>
              <button
                onClick={() => copy(l.token, l.id)}
                className="text-xs text-accent hover:underline shrink-0"
              >
                {copied === l.id ? 'Copied!' : 'Copy link'}
              </button>
              <Link
                href="/app/analytics"
                className="text-xs text-ink-500 hover:text-ink-900 shrink-0"
              >
                Details
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
