import { ImageResponse } from 'next/og';
import { writeQuery } from '@/lib/db-write';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'You have been gifted a Smartkarma insight';

const ACCENT = '#24a9a7';
const ACCENT_50 = '#effaf9';
const INK_900 = '#0a0a0a';
const INK_500 = '#525252';
const INK_300 = '#a3a3a3';

const BRAND_LOGO =
  'https://branding.smartkarma.com/assets/uploaded/sites/10/2021/03/smartkarma-primary-logo-full-colour-1000px.png';

export default async function Image({ params }: { params: { token: string } }) {
  let link: { insight_tagline: string; gifter_name: string; insight_author_name: string } | undefined;
  try {
    link = (
      await writeQuery<{ insight_tagline: string; gifter_name: string; insight_author_name: string }>(
        `SELECT insight_tagline, gifter_name, insight_author_name FROM gift_links WHERE token = $1`,
        [params.token],
      )
    )[0];
  } catch {
    // fall through to a generic card
  }

  const tagline = link?.insight_tagline ?? 'A complimentary read on Smartkarma';
  const gifter = link?.gifter_name ?? null;
  const author = link?.insight_author_name ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          padding: '64px 80px',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: ACCENT }} />

        {/* Header: brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND_LOGO}
            width={210}
            height={40}
            alt="Smartkarma"
            style={{ display: 'block' }}
          />
        </div>

        {/* Pill: gifter */}
        {gifter && (
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              alignItems: 'center',
              gap: 12,
              marginTop: 64,
              background: ACCENT_50,
              border: `2px solid ${ACCENT}`,
              borderRadius: 999,
              padding: '12px 22px',
              fontSize: 22,
              color: INK_900,
              fontWeight: 600,
            }}
          >
            <span style={{ color: ACCENT, fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
              Gifted by
            </span>
            <span>{gifter}</span>
          </div>
        )}

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            marginTop: gifter ? 28 : 80,
            fontSize: 56,
            lineHeight: 1.15,
            fontWeight: 700,
            color: INK_900,
            letterSpacing: '-0.01em',
            maxWidth: 1040,
          }}
        >
          {tagline}
        </div>

        {/* Author */}
        {author && (
          <div style={{ display: 'flex', marginTop: 28, fontSize: 24, color: INK_500 }}>
            by <span style={{ marginLeft: 8, color: INK_900, fontWeight: 600 }}>{author}</span>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
            paddingTop: 24,
            borderTop: `1px solid ${INK_300}`,
            fontSize: 18,
            color: INK_500,
          }}
        >
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: ACCENT, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
              Gift Insight
            </span>
            <span>·</span>
            <span>Full read, no paywall</span>
          </div>
          <div>smartkarma.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
