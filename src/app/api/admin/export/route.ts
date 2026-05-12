import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { writeQuery } from '@/lib/db-write';
import { toCsv } from '@/lib/csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TABLES = ['gifters', 'authors', 'recipients', 'activity', 'links', 'views'] as const;
type Table = (typeof TABLES)[number];

function isTable(s: string): s is Table {
  return (TABLES as readonly string[]).includes(s);
}

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || !isAdminEmail(s.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const t = req.nextUrl.searchParams.get('table') ?? '';
  if (!isTable(t)) {
    return NextResponse.json({ error: 'invalid_table', allowed: TABLES }, { status: 400 });
  }

  const { header, rows } = await loadTable(t);
  const body = toCsv(header, rows);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="gift-insight-${t}-${stamp}.csv"`,
      'cache-control': 'no-store',
    },
  });
}

type Loaded = { header: string[]; rows: (string | number | boolean | null)[][] };

async function loadTable(t: Table): Promise<Loaded> {
  switch (t) {
    case 'gifters': {
      const rows = await writeQuery<{
        gifter_account_id: number;
        gifter_name: string;
        gifter_email: string;
        links_created: number;
        total_views: number;
        total_thanks: number;
        first_link_at: string;
        last_link_at: string;
      }>(
        `SELECT l.gifter_account_id::int, l.gifter_name, l.gifter_email,
                COUNT(*)::int AS links_created,
                COALESCE(SUM(l.view_count), 0)::int AS total_views,
                COUNT(v.id) FILTER (WHERE v.thanked_at IS NOT NULL)::int AS total_thanks,
                MIN(l.created_at) AS first_link_at,
                MAX(l.created_at) AS last_link_at
         FROM gift_links l
         LEFT JOIN gift_views v ON v.gift_link_id = l.id
         GROUP BY l.gifter_account_id, l.gifter_name, l.gifter_email
         ORDER BY links_created DESC, total_views DESC`,
      );
      return {
        header: [
          'gifter_account_id', 'gifter_name', 'gifter_email',
          'links_created', 'total_views', 'total_thanks',
          'first_link_at', 'last_link_at',
        ],
        rows: rows.map((r) => [
          r.gifter_account_id, r.gifter_name, r.gifter_email,
          r.links_created, r.total_views, r.total_thanks,
          r.first_link_at, r.last_link_at,
        ]),
      };
    }
    case 'authors': {
      const rows = await writeQuery<{
        insight_author_account_id: number;
        insight_author_name: string;
        insight_author_email: string;
        times_gifted: number;
        distinct_gifters: number;
        total_views: number;
        total_thanks: number;
      }>(
        `SELECT l.insight_author_account_id::int, l.insight_author_name, l.insight_author_email,
                COUNT(*)::int AS times_gifted,
                COUNT(DISTINCT l.gifter_account_id)::int AS distinct_gifters,
                COALESCE(SUM(l.view_count), 0)::int AS total_views,
                COUNT(v.id) FILTER (WHERE v.thanked_at IS NOT NULL)::int AS total_thanks
         FROM gift_links l
         LEFT JOIN gift_views v ON v.gift_link_id = l.id
         GROUP BY l.insight_author_account_id, l.insight_author_name, l.insight_author_email
         ORDER BY times_gifted DESC, total_views DESC`,
      );
      return {
        header: [
          'author_account_id', 'author_name', 'author_email',
          'times_gifted', 'distinct_gifters', 'total_views', 'total_thanks',
        ],
        rows: rows.map((r) => [
          r.insight_author_account_id, r.insight_author_name, r.insight_author_email,
          r.times_gifted, r.distinct_gifters, r.total_views, r.total_thanks,
        ]),
      };
    }
    case 'recipients': {
      const rows = await writeQuery<{
        recipient_email: string;
        recipient_first_name: string;
        recipient_last_name: string;
        reads: number;
        thanks: number;
        trial_intents: number;
        first_read: string;
        last_read: string;
      }>(
        `SELECT recipient_email,
                MAX(recipient_first_name) AS recipient_first_name,
                MAX(recipient_last_name)  AS recipient_last_name,
                COUNT(*)::int AS reads,
                COUNT(*) FILTER (WHERE thanked_at IS NOT NULL)::int AS thanks,
                COUNT(*) FILTER (WHERE trial_interest_at IS NOT NULL)::int AS trial_intents,
                MIN(viewed_at) AS first_read,
                MAX(viewed_at) AS last_read
         FROM gift_views
         GROUP BY recipient_email
         ORDER BY reads DESC`,
      );
      return {
        header: [
          'recipient_email', 'recipient_first_name', 'recipient_last_name',
          'reads', 'thanks', 'trial_intents', 'first_read', 'last_read',
        ],
        rows: rows.map((r) => [
          r.recipient_email, r.recipient_first_name, r.recipient_last_name,
          r.reads, r.thanks, r.trial_intents, r.first_read, r.last_read,
        ]),
      };
    }
    case 'activity': {
      const rows = await writeQuery<{
        kind: string;
        at: string;
        actor: string;
        detail: string;
      }>(
        `SELECT * FROM (
           SELECT 'link_created'::text AS kind,
                  l.created_at AS at,
                  l.gifter_name AS actor,
                  ('"' || l.insight_tagline || '" - by ' || l.insight_author_name) AS detail
           FROM gift_links l
           UNION ALL
           SELECT 'view'::text,
                  v.viewed_at,
                  (v.recipient_first_name || ' ' || v.recipient_last_name),
                  ('read "' || l.insight_tagline || '" gifted by ' || l.gifter_name)
           FROM gift_views v JOIN gift_links l ON l.id = v.gift_link_id
           UNION ALL
           SELECT 'thanks'::text,
                  v.thanked_at,
                  (v.recipient_first_name || ' ' || v.recipient_last_name),
                  ('thanked ' || l.gifter_name || ' for "' || l.insight_tagline || '"')
           FROM gift_views v JOIN gift_links l ON l.id = v.gift_link_id
           WHERE v.thanked_at IS NOT NULL
           UNION ALL
           SELECT 'trial_intent'::text,
                  v.trial_interest_at,
                  (v.recipient_first_name || ' ' || v.recipient_last_name),
                  ('clicked Start free trial while reading "' || l.insight_tagline || '"')
           FROM gift_views v JOIN gift_links l ON l.id = v.gift_link_id
           WHERE v.trial_interest_at IS NOT NULL
         ) e
         WHERE at IS NOT NULL
         ORDER BY at DESC`,
      );
      return {
        header: ['kind', 'at', 'actor', 'detail'],
        rows: rows.map((r) => [r.kind, r.at, r.actor, r.detail]),
      };
    }
    case 'links': {
      const rows = await writeQuery<{
        id: number;
        token: string;
        gifter_account_id: number;
        gifter_name: string;
        gifter_email: string;
        insight_id: number;
        insight_slug: string;
        insight_tagline: string;
        insight_author_account_id: number;
        insight_author_name: string;
        max_views: number;
        view_count: number;
        depth: number;
        parent_link_id: number | null;
        expires_at: string;
        created_at: string;
      }>(
        `SELECT id::int, token,
                gifter_account_id::int, gifter_name, gifter_email,
                insight_id::int, insight_slug, insight_tagline,
                insight_author_account_id::int, insight_author_name,
                max_views, view_count, depth,
                parent_link_id::int,
                expires_at, created_at
         FROM gift_links
         ORDER BY created_at DESC`,
      );
      return {
        header: [
          'id', 'token',
          'gifter_account_id', 'gifter_name', 'gifter_email',
          'insight_id', 'insight_slug', 'insight_tagline',
          'author_account_id', 'author_name',
          'max_views', 'view_count', 'depth', 'parent_link_id',
          'expires_at', 'created_at',
        ],
        rows: rows.map((r) => [
          r.id, r.token,
          r.gifter_account_id, r.gifter_name, r.gifter_email,
          r.insight_id, r.insight_slug, r.insight_tagline,
          r.insight_author_account_id, r.insight_author_name,
          r.max_views, r.view_count, r.depth, r.parent_link_id,
          r.expires_at, r.created_at,
        ]),
      };
    }
    case 'views': {
      const rows = await writeQuery<{
        id: number;
        gift_link_id: number;
        insight_slug: string;
        insight_tagline: string;
        gifter_name: string;
        recipient_first_name: string;
        recipient_last_name: string;
        recipient_email: string;
        is_pro_client: boolean;
        viewed_at: string;
        thanked_at: string | null;
        trial_interest_at: string | null;
      }>(
        `SELECT v.id::int, v.gift_link_id::int,
                l.insight_slug, l.insight_tagline, l.gifter_name,
                v.recipient_first_name, v.recipient_last_name, v.recipient_email,
                v.is_pro_client, v.viewed_at, v.thanked_at, v.trial_interest_at
         FROM gift_views v
         JOIN gift_links l ON l.id = v.gift_link_id
         ORDER BY v.viewed_at DESC`,
      );
      return {
        header: [
          'id', 'gift_link_id',
          'insight_slug', 'insight_tagline', 'gifter_name',
          'recipient_first_name', 'recipient_last_name', 'recipient_email',
          'is_pro_client', 'viewed_at', 'thanked_at', 'trial_interest_at',
        ],
        rows: rows.map((r) => [
          r.id, r.gift_link_id,
          r.insight_slug, r.insight_tagline, r.gifter_name,
          r.recipient_first_name, r.recipient_last_name, r.recipient_email,
          r.is_pro_client, r.viewed_at, r.thanked_at, r.trial_interest_at,
        ]),
      };
    }
  }
}
