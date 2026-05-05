import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setSessionCookie, signSession, verifyCredentials } from '@/lib/auth';
import { recordSigninAndCheckWelcome, markWelcomeEmailed } from '@/lib/signups';
import { sendEmail, gifterWelcomeHtml } from '@/lib/email';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    const parsed = Body.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

    const session = await verifyCredentials(parsed.data.email, parsed.data.password);
    if (!session) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });

    // First-ever sign-in to Gift Insight → welcome email (fire-and-forget,
    // never allowed to fail the login itself).
    try {
      const isFirst = await recordSigninAndCheckWelcome(session.accountId);
      if (isFirst) {
        const e = env();
        sendEmail({
          to: session.email,
          subject: 'Welcome to Smartkarma Gift Insight',
          html: gifterWelcomeHtml({
            firstName: session.firstName ?? session.name?.split(' ')[0] ?? 'there',
            appBaseUrl: e.APP_BASE_URL,
            maxLinksPerMonth: e.GIFT_MAX_LINKS_PER_GIFTER_PER_MONTH,
            maxViewsPerLink: e.GIFT_MAX_VIEWS_PER_LINK,
            expiryDays: e.GIFT_LINK_EXPIRY_DAYS,
          }),
        }).catch((err) => console.warn('[welcome-email] send failed:', (err as Error).message));
        markWelcomeEmailed(session.accountId).catch((err) => console.warn('[welcome-email] mark failed:', (err as Error).message));
      }
    } catch (err) {
      console.warn('[welcome-email] failed:', (err as Error).message);
    }

    const token = await signSession(session);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, isInsightProvider: session.isInsightProvider });
  } catch (err) {
    console.error('[auth/login] unhandled error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
