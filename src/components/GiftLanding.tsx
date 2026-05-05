'use client';
import { useState, useTransition } from 'react';
import { BrandMark, GiftIcon } from '@/components/icons';

type Props = {
  token: string;
  gifterName: string;
  insightTagline: string;
  authorName: string;
  prefill: { firstName: string; lastName: string; email: string };
  smartkarmaBase: string;
};

type IdentifyOk =
  | { kind: 'pro_redirect'; redirectTo: string; message: string }
  | {
      kind: 'inline_read';
      insightId: number;
      viewId: number;
      readCount: number;
      showLongReaderModal: boolean;
      gifterName: string;
    };

export function GiftLanding(p: Props) {
  const [first, setFirst] = useState(p.prefill.firstName);
  const [last, setLast]   = useState(p.prefill.lastName);
  const [email, setEmail] = useState(p.prefill.email);
  const [error, setError] = useState<string | null>(null);
  const [pending, start]  = useTransition();
  const [proRedirecting, setProRedirecting] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await fetch('/api/recipient/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: p.token, firstName: first.trim(), lastName: last.trim(), email: email.trim() }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j?.message || 'Could not verify those details.');
        return;
      }
      const ok = j as IdentifyOk;
      if (ok.kind === 'pro_redirect') {
        setProRedirecting(ok.redirectTo);
        setTimeout(() => { window.location.href = ok.redirectTo; }, 1800);
        return;
      }
      // Navigate to inline reader, carry view/state via querystring
      const params = new URLSearchParams({
        v: String(ok.viewId),
        i: String(ok.insightId),
        rc: String(ok.readCount),
        long: ok.showLongReaderModal ? '1' : '0',
        g: p.gifterName,
      });
      window.location.href = `/g/${p.token}/read?${params.toString()}`;
    });
  }

  if (proRedirecting) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-ink-50 px-6">
        <div className="max-w-md w-full bg-white border border-ink-100 rounded-2xl shadow-soft p-8 text-center">
          <BrandMark height={22} />
          <h1 className="mt-4 text-xl font-semibold text-ink-900">You're already a Smartkarma client</h1>
          <p className="mt-2 text-sm text-ink-500">Redirecting you to Smartkarma to read the full insight…</p>
          <div className="mt-5 inline-block h-1 w-24 bg-accent/20 overflow-hidden rounded">
            <div className="h-full w-1/2 bg-accent animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-50 px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <BrandMark height={26} />
          <h1 className="mt-4 text-2xl font-semibold text-ink-900">
            <span className="inline-flex items-center gap-1.5 text-base font-normal text-ink-500 mb-1">
              <GiftIcon size={16} className="text-accent" />
              {p.gifterName} gifted you an insight
            </span>
            <span className="block">{p.insightTagline}</span>
          </h1>
          <p className="mt-2 text-xs text-ink-500">by {p.authorName}</p>
        </div>

        <form onSubmit={submit} className="bg-white border border-ink-100 rounded-2xl shadow-soft p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-ink-700">First name</span>
              <input value={first} onChange={(e) => setFirst(e.target.value)} required autoComplete="given-name"
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent outline-none" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-700">Last name</span>
              <input value={last} onChange={(e) => setLast(e.target.value)} required autoComplete="family-name"
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent outline-none" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-ink-700">Business email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent outline-none" />
            <span className="block mt-1 text-[11px] text-ink-500">
              Please use your business email — personal emails (Gmail, Yahoo, Hotmail, iCloud, etc.) are not accepted.
            </span>
          </label>

          {error && <div className="text-xs text-red-600">{error}</div>}

          <button type="submit" disabled={pending}
            className="w-full rounded-lg bg-accent text-white text-sm font-medium py-2.5 hover:bg-accent-600 disabled:opacity-50">
            {pending ? 'Loading insight…' : 'Read insight'}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-ink-400">
          Smartkarma · {new URL(p.smartkarmaBase).host}
        </p>
      </div>
    </main>
  );
}
