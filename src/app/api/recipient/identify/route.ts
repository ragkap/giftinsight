import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { writeQuery } from '@/lib/db-write';
import { isProClient } from '@/lib/auth';
import { isBusinessEmail, isValidName } from '@/lib/disposable-emails';
import { env } from '@/lib/env';
import { sendEmail, proClientNotificationHtml, readNotificationHtml, recipientLinkHtml } from '@/lib/email';

export const runtime = 'nodejs';

const Body = z.object({
  token: z.string().min(8),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email().max(120),
});

type LinkRow = {
  id: number; token: string; gifter_account_id: number; gifter_email: string; gifter_name: string;
  insight_id: number; insight_slug: string; insight_tagline: string;
  insight_author_account_id: number; insight_author_email: string; insight_author_name: string;
  max_views: number; view_count: number; expires_at: string;
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const { token, firstName, lastName, email } = parsed.data;

  if (!isValidName(firstName)) return NextResponse.json({ error: 'invalid_first_name', message: 'Please enter a valid first name (2+ letters).' }, { status: 400 });
  if (!isValidName(lastName))  return NextResponse.json({ error: 'invalid_last_name',  message: 'Please enter a valid last name (2+ letters).' }, { status: 400 });
  const biz = isBusinessEmail(email);
  if (!biz.ok) return NextResponse.json({ error: 'not_business_email', message: biz.reason }, { status: 400 });

  const link = (await writeQuery<LinkRow>(
    `SELECT * FROM gift_links WHERE token = $1`,
    [token],
  ))[0];
  if (!link) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const now = Date.now();
  if (new Date(link.expires_at).getTime() < now) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }
  if (link.view_count >= link.max_views) {
    return NextResponse.json({ error: 'view_limit' }, { status: 410 });
  }

  const proCheck = await isProClient(email);

  // Common metadata for notifications + view records
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = req.headers.get('user-agent') ?? null;

  // First-time-per-recipient check (gift_views.recipient_email is CITEXT, so case-insensitive equality).
  const isFirstVisit = (await writeQuery<{ first: boolean }>(
    `SELECT NOT EXISTS(
       SELECT 1 FROM gift_views
       WHERE gift_link_id = $1 AND recipient_email = $2
     ) AS first`,
    [link.id, email],
  ))[0].first;

  if (proCheck.active) {
    await writeQuery(
      `INSERT INTO gift_views (gift_link_id, recipient_email, recipient_first_name, recipient_last_name, is_pro_client, ip, user_agent)
       VALUES ($1,$2,$3,$4,TRUE,$5,$6)`,
      [link.id, email, firstName, lastName, ip, ua],
    );

    if (isFirstVisit) {
      void sendEmail({
        to: link.gifter_email,
        subject: `${firstName} is already a Smartkarma client`,
        html: proClientNotificationHtml({
          gifterFirstName: link.gifter_name.split(' ')[0] || link.gifter_name,
          recipientFirstName: firstName, recipientLastName: lastName, recipientEmail: email,
          insightTagline: link.insight_tagline,
        }),
      });
    }

    return NextResponse.json({
      kind: 'pro_redirect',
      redirectTo: `${env().SMARTKARMA_BASE_URL.replace(/\/$/, '')}/insights/${link.insight_slug}`,
      message: 'You are already a Smartkarma client. Redirecting to Smartkarma…',
    });
  }

  // Non-Pro: consume a view (only on first visit by this recipient) and record the read.
  if (isFirstVisit) {
    const updated = (await writeQuery<{ id: number; view_count: number }>(
      `UPDATE gift_links
       SET view_count = view_count + 1
       WHERE id = $1 AND view_count < max_views AND expires_at > NOW()
       RETURNING id, view_count`,
      [link.id],
    ))[0];
    if (!updated) {
      return NextResponse.json({ error: 'view_limit' }, { status: 410 });
    }
  }

  const viewRow = (await writeQuery<{ id: number }>(
    `INSERT INTO gift_views (gift_link_id, recipient_email, recipient_first_name, recipient_last_name, is_pro_client, ip, user_agent)
     VALUES ($1,$2,$3,$4,FALSE,$5,$6)
     RETURNING id`,
    [link.id, email, firstName, lastName, ip, ua],
  ))[0];

  const counter = (await writeQuery<{ read_count: number }>(
    `INSERT INTO recipient_read_counters (recipient_email, read_count, last_read_at)
     VALUES ($1, 1, NOW())
     ON CONFLICT (recipient_email) DO UPDATE
       SET read_count = recipient_read_counters.read_count + 1,
           last_read_at = NOW()
     RETURNING read_count`,
    [email],
  ))[0];

  if (isFirstVisit) {
    void sendEmail({
      to: link.gifter_email,
      subject: `${firstName} just read the insight you gifted`,
      html: readNotificationHtml({
        gifterFirstName: link.gifter_name.split(' ')[0] || link.gifter_name,
        recipientFirstName: firstName, recipientLastName: lastName, recipientEmail: email,
        insightTagline: link.insight_tagline,
        appBaseUrl: env().APP_BASE_URL,
      }),
    });

    // Email the recipient a copy of the gift link so they can return later.
    const giftLinkUrl = `${env().APP_BASE_URL.replace(/\/$/, '')}/g/${link.token}`;
    void sendEmail({
      to: email,
      subject: `Your gifted insight: ${link.insight_tagline}`,
      html: recipientLinkHtml({
        recipientFirstName: firstName,
        gifterName: link.gifter_name,
        insightTagline: link.insight_tagline,
        insightAuthor: link.insight_author_name,
        giftLinkUrl,
        expiresAt: new Date(link.expires_at),
      }),
    });
  }

  // Set recipient cookies (auto-fill on future visits)
  const days = env().RECIPIENT_COOKIE_DAYS;
  const res = NextResponse.json({
    kind: 'inline_read',
    insightId: link.insight_id,
    viewId: viewRow.id,
    readCount: counter.read_count,
    showLongReaderModal: counter.read_count >= env().RECIPIENT_THANKS_MODAL_THRESHOLD,
    gifterName: link.gifter_name,
  });
  const cookieOpts = { httpOnly: false, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: days * 86_400 };
  res.cookies.set('sk_gift_first', firstName, cookieOpts);
  res.cookies.set('sk_gift_last',  lastName,  cookieOpts);
  res.cookies.set('sk_gift_email', email,     cookieOpts);
  return res;
}
