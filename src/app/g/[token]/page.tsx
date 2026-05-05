import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { writeQuery } from '@/lib/db-write';
import { GiftLanding } from '@/components/GiftLanding';
import { env } from '@/lib/env';
import { BrandMark, GiftIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  let link: { insight_tagline: string; gifter_name: string } | undefined;
  try {
    link = (
      await writeQuery<{ insight_tagline: string; gifter_name: string }>(
        `SELECT insight_tagline, gifter_name FROM gift_links WHERE token = $1`,
        [token],
      )
    )[0];
  } catch {
    // DB unavailable — fall back to generic share preview.
  }

  const fallbackTitle = "You've been gifted a Smartkarma insight";
  const title = link
    ? `${link.gifter_name} has gifted this Insight to you: "${link.insight_tagline}"`
    : fallbackTitle;
  const description = link
    ? `Read "${link.insight_tagline}" with full access on Smartkarma — gifted by ${link.gifter_name}.`
    : 'A complimentary, full-access read on Smartkarma.';

  // The dynamic image lives at /g/[token]/opengraph-image (Next convention).
  const ogImage = `/g/${encodeURIComponent(token)}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'Smartkarma',
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    robots: { index: false, follow: false },
  };
}

type LinkRow = {
  id: number; token: string; insight_id: number; insight_slug: string;
  insight_tagline: string; insight_author_name: string; gifter_name: string;
  max_views: number; view_count: number; expires_at: string;
};

export default async function GiftLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const link = (await writeQuery<LinkRow>(
    `SELECT id, token, insight_id, insight_slug, insight_tagline, insight_author_name, gifter_name,
            max_views, view_count, expires_at
     FROM gift_links WHERE token = $1`,
    [token],
  ))[0];

  if (!link) return <Expired reason="not_found" />;
  if (new Date(link.expires_at).getTime() < Date.now()) return <Expired reason="expired" />;
  if (link.view_count >= link.max_views) return <Expired reason="exhausted" />;

  const c = await cookies();
  const prefill = {
    firstName: c.get('sk_gift_first')?.value ?? '',
    lastName:  c.get('sk_gift_last')?.value ?? '',
    email:     c.get('sk_gift_email')?.value ?? '',
  };

  return (
    <GiftLanding
      token={link.token}
      gifterName={link.gifter_name}
      insightTagline={link.insight_tagline}
      authorName={link.insight_author_name}
      prefill={prefill}
      smartkarmaBase={env().SMARTKARMA_BASE_URL}
    />
  );
}

function Expired({ reason }: { reason: 'expired' | 'exhausted' | 'not_found' }) {
  const msg =
    reason === 'expired' ? 'This gift link has expired.' :
    reason === 'exhausted' ? 'This gift link has reached its view limit.' :
    'This gift link could not be found.';
  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-50 px-6">
      <div className="max-w-md w-full bg-white border border-ink-100 rounded-2xl shadow-soft p-8 text-center">
        <BrandMark height={22} />
        <h1 className="mt-4 text-xl font-semibold text-ink-900 inline-flex items-center gap-2">
          <GiftIcon size={18} className="text-accent" /> Gift unavailable
        </h1>
        <p className="mt-2 text-sm text-ink-500">{msg}</p>
        <a href="https://www.smartkarma.com" className="inline-block mt-6 text-sm text-accent hover:underline">Visit Smartkarma →</a>
      </div>
    </main>
  );
}
