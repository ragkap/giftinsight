import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { respondToRequest } from '@/lib/permissions';
import { getAccountsByIds } from '@/lib/insights';
import { sendEmail, permissionGrantedHtml } from '@/lib/email';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

const Body = z.object({ action: z.enum(['approve', 'deny']) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const requestId = Number(id);
  if (!Number.isFinite(requestId)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const result = await respondToRequest(requestId, session.accountId, parsed.data.action);
  if (!result.ok) {
    const status = result.reason === 'not_found' ? 404 : result.reason === 'wrong_author' ? 403 : 409;
    return NextResponse.json({ error: result.reason }, { status });
  }

  // On approve, email the grantee with the same "you can now gift" payload
  // as the direct-grant flow. (newlyGranted is false if they were somehow
  // already in the grants list — still send the confirmation.)
  if (parsed.data.action === 'approve') {
    const [grantee] = await getAccountsByIds([result.gifterId]);
    if (grantee?.email) {
      const e = env();
      void sendEmail({
        to: grantee.email,
        subject: `${session.name ?? session.firstName ?? session.email} has invited you to gift their Smartkarma insights`,
        html: permissionGrantedHtml({
          granteeFirstName: grantee.first_name ?? grantee.name?.split(' ')[0] ?? 'there',
          grantorName: session.name ?? session.firstName ?? session.email,
          appBaseUrl: e.APP_BASE_URL,
          maxLinksPerMonth: e.GIFT_MAX_LINKS_PER_GIFTER_PER_MONTH,
          maxViewsPerLink: e.GIFT_MAX_VIEWS_PER_LINK,
          expiryDays: e.GIFT_LINK_EXPIRY_DAYS,
        }),
      }).catch((err) => console.warn('[approve-email] failed:', (err as Error).message));
    }
  }

  return NextResponse.json({ ok: true, action: parsed.data.action });
}
