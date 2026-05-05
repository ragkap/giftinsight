import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { writeQuery } from '@/lib/db-write';
import { sendEmail, trialInterestHtml } from '@/lib/email';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

const Body = z.object({ viewId: z.coerce.number().int().positive() });

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const { viewId } = parsed.data;
  const e = env();

  // Mark interest only the first time per view; if already marked, just return the redirect URL.
  const updated = (await writeQuery<{
    id: number;
    recipient_first_name: string;
    recipient_last_name: string;
    recipient_email: string;
    gift_link_id: number;
    already: boolean;
  }>(
    `WITH cur AS (
       SELECT id, trial_interest_at IS NOT NULL AS already
       FROM gift_views WHERE id = $1
     ),
     upd AS (
       UPDATE gift_views SET trial_interest_at = NOW()
       WHERE id = $1 AND trial_interest_at IS NULL
       RETURNING id
     )
     SELECT v.id, v.recipient_first_name, v.recipient_last_name, v.recipient_email, v.gift_link_id,
            (SELECT already FROM cur) AS already
     FROM gift_views v
     WHERE v.id = $1`,
    [viewId],
  ))[0];

  if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (!updated.already) {
    const link = (await writeQuery<{ insight_tagline: string; gifter_name: string }>(
      `SELECT insight_tagline, gifter_name FROM gift_links WHERE id = $1`,
      [updated.gift_link_id],
    ))[0];
    if (link) {
      void sendEmail({
        to: e.SALES_EMAIL,
        subject: `Trial intent: ${updated.recipient_first_name} ${updated.recipient_last_name} (${updated.recipient_email})`,
        html: trialInterestHtml({
          recipientFirstName: updated.recipient_first_name,
          recipientLastName: updated.recipient_last_name,
          recipientEmail: updated.recipient_email,
          gifterName: link.gifter_name,
          insightTagline: link.insight_tagline,
          appBaseUrl: e.APP_BASE_URL,
        }),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    redirectTo: e.SMARTKARMA_TRIAL_SIGNUP_URL,
    alreadyEmailed: updated.already,
  });
}
