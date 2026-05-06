// Dev-only route: fires one of each email template to rk@smartkarma.com
// for visual review. Disabled in production.

import { NextRequest, NextResponse } from 'next/server';
import {
  sendEmail,
  readNotificationHtml,
  proClientNotificationHtml,
  thanksToAuthorHtml,
  trialInterestHtml,
  gifterWelcomeHtml,
  recipientLinkHtml,
  permissionGrantedHtml,
} from '@/lib/email';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

const DEFAULT_REVIEW_TO = 'rk@smartkarma.com';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled_in_production' }, { status: 403 });
  }
  const REVIEW_TO = req.nextUrl.searchParams.get('to')?.trim() || DEFAULT_REVIEW_TO;
  const ONLY = req.nextUrl.searchParams.get('only')?.trim().toLowerCase() || null;

  const e = env();
  const sample = {
    gifterFirstName: 'Raghav',
    gifterLastName: 'Kapoor',
    gifterFullName: 'Raghav Kapoor',
    recipientFirstName: 'Jane',
    recipientLastName: 'Doe',
    recipientEmail: 'jane.doe@acme-fund.com',
    insightTagline: "Curator's Cut: Soft Commodities' Hard Truths, Pricing China's Hi-Tech",
    insightAuthor: 'Pranav Rao',
    authorFirstName: 'Pranav',
    expiresAt: new Date(Date.now() + e.GIFT_LINK_EXPIRY_DAYS * 86_400_000),
    giftLinkUrl: `${e.APP_BASE_URL.replace(/\/$/, '')}/g/SAMPLEtokenSAMPLEtokenABC`,
  };

  const messages: Array<{ key: string; subject: string; html: string }> = [
    {
      key: 'read',
      subject: '[TEST 1/7] Read notification → gifter',
      html: readNotificationHtml({
        gifterFirstName: sample.gifterFirstName,
        recipientFirstName: sample.recipientFirstName,
        recipientLastName: sample.recipientLastName,
        recipientEmail: sample.recipientEmail,
        insightTagline: sample.insightTagline,
        appBaseUrl: e.APP_BASE_URL,
      }),
    },
    {
      key: 'pro',
      subject: '[TEST 2/7] Pro-client redirect → gifter',
      html: proClientNotificationHtml({
        gifterFirstName: sample.gifterFirstName,
        recipientFirstName: sample.recipientFirstName,
        recipientLastName: sample.recipientLastName,
        recipientEmail: sample.recipientEmail,
        insightTagline: sample.insightTagline,
      }),
    },
    {
      key: 'thanks',
      subject: '[TEST 3/7] Thanks → insight author',
      html: thanksToAuthorHtml({
        authorFirstName: sample.authorFirstName,
        gifterFirstName: sample.gifterFirstName,
        gifterLastName: sample.gifterLastName,
        recipientFirstName: sample.recipientFirstName,
        recipientLastName: sample.recipientLastName,
        insightTagline: sample.insightTagline,
      }),
    },
    {
      key: 'trial',
      subject: `[TEST 4/7] Trial intent → ${e.SALES_EMAIL}`,
      html: trialInterestHtml({
        recipientFirstName: sample.recipientFirstName,
        recipientLastName: sample.recipientLastName,
        recipientEmail: sample.recipientEmail,
        gifterName: sample.gifterFullName,
        insightTagline: sample.insightTagline,
        appBaseUrl: e.APP_BASE_URL,
      }),
    },
    {
      key: 'welcome',
      subject: '[TEST 5/7] Welcome → first-time gifter',
      html: gifterWelcomeHtml({
        firstName: sample.gifterFirstName,
        appBaseUrl: e.APP_BASE_URL,
        maxLinksPerMonth: e.GIFT_MAX_LINKS_PER_GIFTER_PER_MONTH,
        maxViewsPerLink: e.GIFT_MAX_VIEWS_PER_LINK,
        expiryDays: e.GIFT_LINK_EXPIRY_DAYS,
      }),
    },
    {
      key: 'recipient-link',
      subject: '[TEST 6/7] Recipient link → reader',
      html: recipientLinkHtml({
        recipientFirstName: sample.recipientFirstName,
        gifterName: sample.gifterFullName,
        insightTagline: sample.insightTagline,
        insightAuthor: sample.insightAuthor,
        giftLinkUrl: sample.giftLinkUrl,
        expiresAt: sample.expiresAt,
      }),
    },
    {
      key: 'permission-granted',
      subject: '[TEST 7/7] Permission granted → grantee',
      html: permissionGrantedHtml({
        granteeFirstName: sample.recipientFirstName,
        grantorName: sample.gifterFullName,
        appBaseUrl: e.APP_BASE_URL,
        maxLinksPerMonth: e.GIFT_MAX_LINKS_PER_GIFTER_PER_MONTH,
        maxViewsPerLink: e.GIFT_MAX_VIEWS_PER_LINK,
        expiryDays: e.GIFT_LINK_EXPIRY_DAYS,
      }),
    },
  ];

  const filtered = ONLY ? messages.filter((m) => m.key === ONLY) : messages;
  if (ONLY && filtered.length === 0) {
    return NextResponse.json({
      error: 'unknown_only',
      hint: `valid keys: ${messages.map((m) => m.key).join(', ')}`,
    }, { status: 400 });
  }

  const results: Array<{ subject: string; ok: boolean; id?: string; error?: string; skipped?: boolean }> = [];
  for (let i = 0; i < filtered.length; i++) {
    const m = filtered[i];
    if (i > 0) await new Promise((r) => setTimeout(r, 600)); // stay under Resend's 2 req/sec
    try {
      const r = await sendEmail({ to: REVIEW_TO, subject: m.subject, html: m.html });
      if ('skipped' in r && r.skipped) {
        results.push({ subject: m.subject, ok: false, skipped: true, error: 'RESEND_API_KEY missing' });
      } else if (r.error) {
        results.push({ subject: m.subject, ok: false, error: JSON.stringify(r.error) });
      } else {
        results.push({ subject: m.subject, ok: true, id: r.id });
      }
    } catch (err) {
      results.push({ subject: m.subject, ok: false, error: (err as Error).message });
    }
  }

  return NextResponse.json({ to: REVIEW_TO, results });
}
