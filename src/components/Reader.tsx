'use client';
import { useEffect, useRef, useState } from 'react';
import type { TrendingInsight } from '@/lib/trending';
import { BrandMark, CheckIcon, GiftIcon } from '@/components/icons';
import { fmtDate } from '@/lib/fmt';

type Props = {
  tagline: string;
  authorName: string;
  publishedAt: string | null;
  entityName: string | null;
  ticker: string | null;
  executiveSummaryHtml: string;
  detailHtml: string;
  gifterName: string;
  viewId: number;
  readCount: number;
  showLongReaderModal: boolean;
  thanksThreshold: number;
  trending: TrendingInsight[];
};

export function Reader(p: Props) {
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [thanked, setThanked] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [longModal, setLongModal] = useState(false);
  const popupShown = useRef(false);

  useEffect(() => {
    if (!toastVisible) return;
    const t = setTimeout(() => setToastVisible(false), 2800);
    return () => clearTimeout(t);
  }, [toastVisible]);

  useEffect(() => {
    function onScroll() {
      if (popupShown.current || popupDismissed) return;
      const trigger = window.innerHeight; // 100vh
      if (window.scrollY >= trigger) {
        popupShown.current = true;
        setPopupOpen(true);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [popupDismissed]);

  async function thanks() {
    setThanked(true);
    setPopupOpen(false);
    setToastVisible(true);
    try {
      await fetch('/api/recipient/thanks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewId: p.viewId }),
      });
    } catch {}
    if (p.showLongReaderModal || p.readCount >= p.thanksThreshold) {
      setLongModal(true);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-ink-100 bg-white sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3">
          <BrandMark height={20} />
          <div className="hidden md:inline-flex items-center gap-2 text-[11px] text-ink-500 bg-accent-50 border border-accent/30 rounded-full px-3 py-1">
            <GiftIcon size={14} className="text-accent" />
            <span>Gifted by <span className="font-medium text-ink-800">{p.gifterName}</span></span>
          </div>
          <div className="ml-auto">
            <TrialButton viewId={p.viewId} variant="nav">
              Start free trial
            </TrialButton>
          </div>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 pt-10 pb-24">
        <div className="text-xs text-ink-500 flex flex-wrap items-center gap-2">
          {p.ticker && <span className="font-mono text-accent-700">{p.ticker}</span>}
          {p.entityName && <span>{p.entityName}</span>}
          {p.publishedAt && <span>· {fmtDate(p.publishedAt)}</span>}
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold leading-tight text-ink-900">
          {p.tagline}
        </h1>
        <div className="mt-3 text-sm text-ink-500">By <span className="text-ink-800">{p.authorName}</span></div>

        {p.executiveSummaryHtml && (
          <section className="mt-8 border-l-2 border-accent/40 pl-4">
            <div className="text-[11px] uppercase tracking-wider text-accent font-semibold mb-2">Executive summary</div>
            <div className="prose-sk" dangerouslySetInnerHTML={{ __html: p.executiveSummaryHtml }} />
          </section>
        )}

        <section className="mt-8 prose-sk" dangerouslySetInnerHTML={{ __html: p.detailHtml || '<p>(No further detail.)</p>' }} />

        <BottomCta trending={p.trending} viewId={p.viewId} />
      </article>

      {popupOpen && !thanked && (
        <ScrollPopup
          gifterName={p.gifterName}
          onThanks={thanks}
          onClose={() => { setPopupOpen(false); setPopupDismissed(true); }}
        />
      )}

      {toastVisible && !longModal && <ThanksToast />}

      {longModal && (
        <LongReaderModal
          trending={p.trending}
          viewId={p.viewId}
          onClose={() => setLongModal(false)}
        />
      )}
    </main>
  );
}

function TrialButton({
  viewId,
  variant,
  children,
}: {
  viewId: number;
  variant: 'nav' | 'modal' | 'cta';
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function go(e: React.MouseEvent) {
    e.preventDefault();
    if (pending || confirmed) return;
    setPending(true);
    setErrorMsg(null);
    try {
      if (viewId > 0) {
        const r = await fetch('/api/recipient/trial-interest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ viewId }),
        });
        if (!r.ok) throw new Error(`status ${r.status}`);
      }
      setConfirmed(true);
    } catch {
      setErrorMsg("We couldn't reach our trial team. Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  const cls =
    variant === 'nav'
      ? 'inline-flex items-center gap-1.5 rounded-full bg-accent text-white text-xs sm:text-sm font-semibold px-3.5 sm:px-4 py-2 hover:bg-accent-600 active:scale-[0.98] transition shadow-sm disabled:opacity-60'
      : variant === 'modal'
      ? 'block w-full text-center rounded-xl bg-accent text-white text-base font-semibold py-3.5 hover:bg-accent-600 active:scale-[0.99] transition shadow-md ring-2 ring-accent/30 ring-offset-2 disabled:opacity-60'
      : 'inline-flex items-center gap-2 rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2.5 hover:bg-accent-600 active:scale-[0.98] transition shadow disabled:opacity-60';

  return (
    <>
      <button type="button" onClick={go} className={cls} disabled={pending} aria-busy={pending}>
        {pending ? 'Setting up…' : children}
      </button>
      {errorMsg && <div className="mt-2 text-xs text-red-600">{errorMsg}</div>}
      {confirmed && <TrialConfirmedModal onClose={() => setConfirmed(false)} />}
    </>
  );
}

function TrialConfirmedModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-confirmed-title"
      className="fixed inset-0 z-[60] bg-ink-900/60 flex items-center justify-center px-4"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-accent/20 p-7 text-center animate-gift-popup">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-4 h-8 w-8 rounded-full text-ink-400 hover:text-ink-900 hover:bg-ink-100 inline-flex items-center justify-center text-lg"
        >
          ×
        </button>

        <div className="mx-auto h-14 w-14 rounded-full bg-accent text-white inline-flex items-center justify-center shadow">
          <CheckIcon size={28} className="text-white" />
        </div>

        <h2 id="trial-confirmed-title" className="mt-4 text-xl font-semibold text-ink-900">
          Your trial is being initiated
        </h2>
        <p className="mt-2 text-sm text-ink-700">
          A Smartkarma team member is setting up your free 2-week full-access trial right now.
          <span className="block mt-1">Look out for login details in your inbox shortly.</span>
        </p>

        <button
          onClick={onClose}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-accent text-white text-sm font-semibold px-5 py-2.5 hover:bg-accent-600"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function ScrollPopup({ gifterName, onThanks, onClose }: { gifterName: string; onThanks: () => void; onClose: () => void }) {
  const initials =
    gifterName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || 'SK';

  return (
    <div className="fixed inset-x-0 bottom-4 md:bottom-8 z-50 px-4 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl animate-gift-popup">
        <div
          role="dialog"
          aria-label="Gifted insight"
          className="relative flex items-stretch overflow-hidden rounded-2xl border border-accent/40 bg-white shadow-2xl ring-1 ring-accent/10"
        >
          <div className="w-[6px] bg-accent shrink-0" aria-hidden />
          <div className="flex-1 flex items-center gap-4 p-5 md:p-6">
            <div className="relative shrink-0">
              <div className="h-12 w-12 rounded-full bg-accent text-white font-semibold text-base flex items-center justify-center animate-gift-pulse">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white border border-accent/30 flex items-center justify-center text-accent">
                <GiftIcon size={14} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">
                <GiftIcon size={12} />
                Gifted insight
              </div>
              <p className="mt-1 text-[15px] md:text-base text-ink-900 leading-snug">
                You've been gifted this insight by <strong className="font-semibold">{gifterName}</strong>.
                <span className="block text-ink-600 text-sm mt-0.5">Be sure to say thanks!</span>
              </p>
            </div>

            <button
              onClick={onThanks}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-sm font-medium px-4 py-2.5 hover:bg-accent-600 active:scale-[0.98] transition shadow"
            >
              <GiftIcon size={14} className="text-white" />
              Thanks
            </button>
          </div>

          <button
            onClick={onClose}
            aria-label="Dismiss"
            className="absolute top-2 right-2 h-7 w-7 rounded-full text-ink-400 hover:text-ink-900 hover:bg-ink-100 inline-flex items-center justify-center text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

function ThanksToast() {
  return (
    <div className="fixed inset-x-0 bottom-4 md:bottom-8 z-50 px-4 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl animate-gift-popup">
        <div
          role="status"
          aria-live="polite"
          className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-accent/40 bg-white shadow-2xl ring-1 ring-accent/10"
        >
          <div className="w-[6px] self-stretch bg-accent" aria-hidden />
          <div className="flex-1 flex items-center gap-3 p-4 md:p-5">
            <div className="h-9 w-9 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
              <GiftIcon size={16} className="text-white" />
            </div>
            <div className="flex-1 text-sm md:text-[15px] text-ink-900 font-medium">Thanks sent ✓</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomCta({ trending, viewId }: { trending: TrendingInsight[]; viewId: number }) {
  return (
    <section className="mt-16 rounded-2xl border border-accent/30 bg-accent-50/60 p-6">
      <h2 className="text-lg font-semibold text-ink-900 inline-flex items-center gap-2">
        <GiftIcon size={18} className="text-accent" /> Hope you found that useful.
      </h2>
      <p className="mt-1 text-sm text-ink-700">
        Get full access to every Smartkarma insight with a free 2-week trial.
      </p>
      <div className="mt-4">
        <TrialButton viewId={viewId} variant="cta">
          <GiftIcon size={16} className="text-white" />
          Start free 2-week trial
        </TrialButton>
      </div>
      {trending.length > 0 && (
        <>
          <div className="mt-6 text-xs uppercase tracking-wider text-ink-500 font-semibold">Trending insights</div>
          <ul className="mt-2 divide-y divide-accent/20">
            {trending.map((t) => (
              <li key={String(t.id)} className="py-2">
                <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm text-ink-800 hover:text-accent">
                  {t.tagline}
                </a>
                {t.author && <div className="text-[11px] text-ink-500">{t.author}</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function LongReaderModal({
  trending, viewId, onClose,
}: { trending: TrendingInsight[]; viewId: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink-900/60 flex items-start md:items-center justify-center px-4 py-8 overflow-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-accent/20">
        <button
          onClick={onClose} aria-label="Close"
          className="absolute top-3 right-4 h-8 w-8 rounded-full text-ink-400 hover:text-ink-900 hover:bg-ink-100 inline-flex items-center justify-center text-lg"
        >×</button>

        <div className="px-7 pt-7 pb-4">
          <BrandMark height={22} />
          <h2 className="mt-3 text-2xl font-semibold text-ink-900">You've read several insights.</h2>
          <p className="mt-1 text-sm text-ink-700">Would you like to read many more — across every sector and market on Smartkarma?</p>

          <div className="mt-5">
            <TrialButton viewId={viewId} variant="modal">
              Start free 2-week full-access trial
            </TrialButton>
            <p className="mt-2 text-center text-[11px] text-ink-500">No credit card required.</p>
          </div>
        </div>

        {trending.length > 0 && (
          <div className="px-7 pb-7">
            <div className="text-xs uppercase tracking-wider text-ink-500 font-semibold mb-2">Trending now</div>
            <ul className="divide-y divide-ink-100">
              {trending.map((t) => (
                <li key={String(t.id)} className="py-2.5">
                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-sm text-ink-800 hover:text-accent leading-snug">
                    {t.tagline}
                  </a>
                  {t.author && <div className="text-[11px] text-ink-500 mt-0.5">{t.author}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
