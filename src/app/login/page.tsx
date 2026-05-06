import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { LoginForm } from '@/components/LoginForm';
import { BrandMark } from '@/components/icons';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const s = await getSession();
  if (s) redirect('/app');
  const e = env();

  return (
    <main className="min-h-screen bg-ink-50 px-4 py-10 md:py-16 flex items-center justify-center">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-10 md:gap-16 items-start">
        {/* Sign-in column */}
        <div className="w-full md:max-w-sm md:ml-auto">
          <div className="mb-7 text-center md:text-left">
            <BrandMark height={26} compact={false} />
            <h1 className="mt-5 text-2xl font-semibold text-ink-900 tracking-tight">
              Gift <span className="text-accent">Insight</span>
              <sup className="ml-1 text-[10px] tracking-[0.18em] text-accent font-bold align-super">
                BETA
              </sup>
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">
              Sign in with your Smartkarma credentials.
            </p>
          </div>
          <LoginForm />
        </div>

        {/* Explainer column */}
        <aside className="w-full md:max-w-md text-ink-800">
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent font-semibold">
            How it works
          </div>
          <ol className="mt-3 space-y-4">
            {[
              {
                title: 'Search any insight you can gift',
                body: 'By tagline, author, company name, or Bloomberg ticker — across the last two years of Smartkarma research.',
              },
              {
                title: 'Click Gift — link is on your clipboard',
                body: 'Drop it into Slack, email, or WhatsApp. The recipient does the rest.',
              },
              {
                title: 'They read the full insight, no paywall',
                body: (
                  <>
                    Your recipient enters their business email —{' '}
                    <mark className="bg-accent-100 text-ink-900 font-semibold rounded px-1 py-0.5 [text-decoration:none]">
                      no Smartkarma account required — and reads the entire piece.
                    </mark>
                  </>
                ),
              },
              {
                title: 'Track opens, thanks & follow-ups',
                body: 'Your dashboard shows who has read each gift and who said thanks. We email you the moment they open it.',
              },
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-accent text-white text-[12px] font-semibold">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink-900">{step.title}</div>
                  <div className="mt-0.5 text-sm text-ink-600 leading-snug">{step.body}</div>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-7 rounded-xl border border-accent/30 bg-accent-50/60 p-4 text-sm text-ink-800">
            <div className="text-[11px] uppercase tracking-wider text-accent font-semibold">
              What you get
            </div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-semibold text-ink-900">{e.GIFT_MAX_LINKS_PER_GIFTER_PER_MONTH}</div>
                <div className="text-[11px] text-ink-500">gift links / month</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-ink-900">{e.GIFT_MAX_VIEWS_PER_LINK}</div>
                <div className="text-[11px] text-ink-500">views per link</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-ink-900">{e.GIFT_LINK_EXPIRY_DAYS}d</div>
                <div className="text-[11px] text-ink-500">link expiry</div>
              </div>
            </div>
          </div>

          <p className="mt-5 text-xs text-ink-500">
            <strong className="text-ink-700">Beta.</strong> Gift Insight is a standalone product today —
            it&apos;ll be fully integrated into the main Smartkarma platform soon.
          </p>
        </aside>
      </div>
    </main>
  );
}
