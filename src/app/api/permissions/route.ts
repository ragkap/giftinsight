import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getPermissionState, grantPermission, revokePermission, setOpenToAll } from '@/lib/permissions';
import { getAccountsByIds } from '@/lib/insights';
import { sendEmail, permissionGrantedHtml } from '@/lib/email';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!session.isInsightProvider) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const state = await getPermissionState(session.accountId);
  const accounts = await getAccountsByIds(state.grants.map((g) => g.gifter_account_id));
  const byId = new Map(accounts.map((a) => [a.id, a]));

  return NextResponse.json({
    openToAll: state.openToAll,
    grants: state.grants.map((g) => {
      const a = byId.get(g.gifter_account_id);
      return {
        id: g.gifter_account_id,
        name: a?.name ?? a?.first_name ?? a?.email ?? `User ${g.gifter_account_id}`,
        company: a?.company_name ?? null,
        createdAt: g.created_at,
      };
    }),
  });
}

const PostBody = z.discriminatedUnion('action', [
  z.object({ action: z.literal('grant'), gifterId: z.coerce.number().int().positive() }),
  z.object({ action: z.literal('revoke'), gifterId: z.coerce.number().int().positive() }),
  z.object({ action: z.literal('open'), openToAll: z.boolean() }),
]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!session.isInsightProvider) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const parsed = PostBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  switch (parsed.data.action) {
    case 'grant': {
      if (parsed.data.gifterId === session.accountId) return NextResponse.json({ error: 'self' }, { status: 400 });
      const inserted = await grantPermission(session.accountId, parsed.data.gifterId);
      if (inserted) {
        // Notify the new grantee (fire-and-forget; never block the API response).
        notifyGrantee(parsed.data.gifterId, session.name ?? session.firstName ?? session.email)
          .catch((err) => console.warn('[permission-granted-email] failed:', (err as Error).message));
      }
      break;
    }
    case 'revoke':
      await revokePermission(session.accountId, parsed.data.gifterId);
      break;
    case 'open':
      await setOpenToAll(session.accountId, parsed.data.openToAll);
      break;
  }
  return NextResponse.json({ ok: true });
}

async function notifyGrantee(granteeId: number, grantorName: string) {
  const [grantee] = await getAccountsByIds([granteeId]);
  if (!grantee?.email) return;
  const e = env();
  await sendEmail({
    to: grantee.email,
    subject: `${grantorName} has invited you to gift their Smartkarma insights`,
    html: permissionGrantedHtml({
      granteeFirstName: grantee.first_name ?? grantee.name?.split(' ')[0] ?? 'there',
      grantorName,
      appBaseUrl: e.APP_BASE_URL,
      maxLinksPerMonth: e.GIFT_MAX_LINKS_PER_GIFTER_PER_MONTH,
      maxViewsPerLink: e.GIFT_MAX_VIEWS_PER_LINK,
      expiryDays: e.GIFT_LINK_EXPIRY_DAYS,
    }),
  });
}
