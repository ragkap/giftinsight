import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { writeQuery } from '@/lib/db-write';
import { sendEmail, thanksToAuthorHtml } from '@/lib/email';

export const runtime = 'nodejs';

const Body = z.object({ viewId: z.coerce.number().int().positive() });

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const view = (await writeQuery<{
    id: number; gift_link_id: number; recipient_first_name: string; recipient_last_name: string;
    recipient_email: string; thanked_at: string | null;
  }>(
    `UPDATE gift_views SET thanked_at = COALESCE(thanked_at, NOW())
     WHERE id = $1
     RETURNING id, gift_link_id, recipient_first_name, recipient_last_name, recipient_email, thanked_at`,
    [parsed.data.viewId],
  ))[0];
  if (!view) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const link = (await writeQuery<{
    insight_tagline: string;
    insight_author_email: string; insight_author_name: string;
    gifter_name: string; gifter_email: string;
  }>(
    `SELECT insight_tagline, insight_author_email, insight_author_name, gifter_name, gifter_email
     FROM gift_links WHERE id = $1`,
    [view.gift_link_id],
  ))[0];

  if (link) {
    void sendEmail({
      to: link.insight_author_email,
      subject: `${view.recipient_first_name} thanked you for "${link.insight_tagline}"`,
      html: thanksToAuthorHtml({
        authorFirstName: link.insight_author_name.split(' ')[0] || link.insight_author_name,
        gifterFirstName: link.gifter_name.split(' ')[0] || link.gifter_name,
        gifterLastName: link.gifter_name.split(' ').slice(1).join(' ') || '',
        recipientFirstName: view.recipient_first_name,
        recipientLastName: view.recipient_last_name,
        insightTagline: link.insight_tagline,
      }),
    });
  }

  return NextResponse.json({ ok: true, thankedAt: view.thanked_at });
}
