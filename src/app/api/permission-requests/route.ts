import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { createPermissionRequest, listPendingRequestsForAuthor, listOutgoingRequestsForGifter } from '@/lib/permissions';
import { getAccountsByIds } from '@/lib/insights';
import { sendEmail, requestToAuthorHtml } from '@/lib/email';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

const PostBody = z.object({
  authorId: z.coerce.number().int().positive(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [incoming, outgoing] = await Promise.all([
    listPendingRequestsForAuthor(session.accountId),
    listOutgoingRequestsForGifter(session.accountId),
  ]);

  const ids = Array.from(
    new Set([
      ...incoming.map((r) => r.gifter_account_id),
      ...outgoing.map((r) => r.author_account_id),
    ]),
  );
  const accounts = ids.length ? await getAccountsByIds(ids) : [];
  const byId = new Map(accounts.map((a) => [Number(a.id), a]));

  return NextResponse.json({
    incoming: incoming.map((r) => {
      const a = byId.get(r.gifter_account_id);
      return {
        id: r.id,
        gifterId: r.gifter_account_id,
        gifterName: a?.name ?? a?.first_name ?? a?.email ?? `User ${r.gifter_account_id}`,
        gifterCompany: a?.company_name ?? null,
        createdAt: r.created_at,
      };
    }),
    outgoing: outgoing.map((r) => {
      const a = byId.get(r.author_account_id);
      return {
        id: r.id,
        authorId: r.author_account_id,
        authorName: a?.name ?? a?.first_name ?? a?.email ?? `User ${r.author_account_id}`,
        authorCompany: a?.company_name ?? null,
        status: r.status,
        createdAt: r.created_at,
        respondedAt: r.responded_at,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const parsed = PostBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  if (parsed.data.authorId === session.accountId) {
    return NextResponse.json({ error: 'cannot_request_self' }, { status: 400 });
  }

  let result;
  try {
    result = await createPermissionRequest(parsed.data.authorId, session.accountId);
  } catch {
    return NextResponse.json({ error: 'cannot_request_self' }, { status: 400 });
  }

  if (result.kind === 'already_approved') {
    return NextResponse.json({ ok: true, kind: result.kind, requestId: result.requestId });
  }

  // Look up author for the email + the gifter's company for context (one query).
  if (result.kind === 'created' || result.kind === 'reopened') {
    const accounts = await getAccountsByIds([parsed.data.authorId, session.accountId]);
    const byId = new Map(accounts.map((a) => [Number(a.id), a]));
    const author = byId.get(parsed.data.authorId);
    const gifter = byId.get(session.accountId);
    if (author?.email) {
      void sendEmail({
        to: author.email,
        subject: `${gifter?.name ?? session.name ?? session.email} would like to gift your insights`,
        html: requestToAuthorHtml({
          authorFirstName: author.first_name ?? author.name?.split(' ')[0] ?? 'there',
          gifterName: gifter?.name ?? session.name ?? session.email,
          gifterCompany: gifter?.company_name ?? null,
          appBaseUrl: env().APP_BASE_URL,
        }),
      }).catch((err) => console.warn('[request-email] failed:', (err as Error).message));
    }
  }

  return NextResponse.json({ ok: true, kind: result.kind, requestId: result.requestId });
}
