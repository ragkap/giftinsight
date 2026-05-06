import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setSessionCookie, signSession, verifyCredentials } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';

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

    if (!isAdminEmail(parsed.data.email)) {
      // Don't leak whether the credentials are valid; just say forbidden.
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const session = await verifyCredentials(parsed.data.email, parsed.data.password);
    if (!session) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });

    const token = await signSession(session);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/login] unhandled error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
