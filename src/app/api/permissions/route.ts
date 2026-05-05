import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getPermissionState, grantPermission, revokePermission, setOpenToAll } from '@/lib/permissions';
import { getAccountsByIds } from '@/lib/insights';

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
    case 'grant':
      if (parsed.data.gifterId === session.accountId) return NextResponse.json({ error: 'self' }, { status: 400 });
      await grantPermission(session.accountId, parsed.data.gifterId);
      break;
    case 'revoke':
      await revokePermission(session.accountId, parsed.data.gifterId);
      break;
    case 'open':
      await setOpenToAll(session.accountId, parsed.data.openToAll);
      break;
  }
  return NextResponse.json({ ok: true });
}
