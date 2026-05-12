import { writeQuery } from '@/lib/db-write';
import { fmtDate } from '@/lib/fmt';
import { ActivityTable, type ActivityRow } from '@/components/ActivityTable';
import { ExportCsvButton } from '@/components/ExportCsvButton';

export const dynamic = 'force-dynamic';

type Stats = {
  total_links: number;
  total_views: number;
  total_thanks: number;
  distinct_gifters: number;
  distinct_recipients: number;
  pro_redirects: number;
};

type TopGifter = {
  gifter_account_id: number;
  gifter_name: string;
  gifter_email: string;
  links_created: number;
  total_views: number;
  total_thanks: number;
  last_link_at: string;
};

type TopAuthor = {
  insight_author_account_id: number;
  insight_author_name: string;
  times_gifted: number;
  distinct_gifters: number;
  total_views: number;
};

type TopRecipient = {
  recipient_email: string;
  recipient_first_name: string;
  recipient_last_name: string;
  reads: number;
  thanks: number;
  last_read: string;
};

async function loadStats(): Promise<Stats> {
  const linkRow = (await writeQuery<{ total_links: number; distinct_gifters: number }>(
    `SELECT COUNT(*)::int AS total_links,
            COUNT(DISTINCT gifter_account_id)::int AS distinct_gifters
     FROM gift_links`,
  ))[0];
  const viewRow = (await writeQuery<{
    total_views: number;
    total_thanks: number;
    distinct_recipients: number;
    pro_redirects: number;
  }>(
    `SELECT COUNT(*)::int AS total_views,
            COUNT(*) FILTER (WHERE thanked_at IS NOT NULL)::int AS total_thanks,
            COUNT(DISTINCT recipient_email)::int AS distinct_recipients,
            COUNT(*) FILTER (WHERE is_pro_client = TRUE)::int AS pro_redirects
     FROM gift_views`,
  ))[0];
  return {
    total_links: linkRow?.total_links ?? 0,
    distinct_gifters: linkRow?.distinct_gifters ?? 0,
    total_views: viewRow?.total_views ?? 0,
    total_thanks: viewRow?.total_thanks ?? 0,
    distinct_recipients: viewRow?.distinct_recipients ?? 0,
    pro_redirects: viewRow?.pro_redirects ?? 0,
  };
}

async function loadTopGifters(): Promise<TopGifter[]> {
  return await writeQuery<TopGifter>(
    `SELECT l.gifter_account_id::int, l.gifter_name, l.gifter_email,
            COUNT(*)::int AS links_created,
            COALESCE(SUM(l.view_count), 0)::int AS total_views,
            COUNT(v.id) FILTER (WHERE v.thanked_at IS NOT NULL)::int AS total_thanks,
            MAX(l.created_at) AS last_link_at
     FROM gift_links l
     LEFT JOIN gift_views v ON v.gift_link_id = l.id
     GROUP BY l.gifter_account_id, l.gifter_name, l.gifter_email
     ORDER BY links_created DESC, total_views DESC
     LIMIT 25`,
  );
}

async function loadTopAuthors(): Promise<TopAuthor[]> {
  return await writeQuery<TopAuthor>(
    `SELECT insight_author_account_id::int, insight_author_name,
            COUNT(*)::int AS times_gifted,
            COUNT(DISTINCT gifter_account_id)::int AS distinct_gifters,
            COALESCE(SUM(view_count), 0)::int AS total_views
     FROM gift_links
     GROUP BY insight_author_account_id, insight_author_name
     ORDER BY times_gifted DESC, total_views DESC
     LIMIT 25`,
  );
}

async function loadTopRecipients(): Promise<TopRecipient[]> {
  return await writeQuery<TopRecipient>(
    `SELECT recipient_email,
            MAX(recipient_first_name) AS recipient_first_name,
            MAX(recipient_last_name)  AS recipient_last_name,
            COUNT(*)::int AS reads,
            COUNT(*) FILTER (WHERE thanked_at IS NOT NULL)::int AS thanks,
            MAX(viewed_at) AS last_read
     FROM gift_views
     GROUP BY recipient_email
     ORDER BY reads DESC
     LIMIT 25`,
  );
}

async function loadActivity(): Promise<ActivityRow[]> {
  return await writeQuery<ActivityRow>(
    `SELECT * FROM (
       SELECT 'link_created'::text AS kind,
              l.created_at AS at,
              l.gifter_name AS actor,
              ('"' || LEFT(l.insight_tagline, 80) || '" — by ' || l.insight_author_name) AS detail
       FROM gift_links l
       UNION ALL
       SELECT 'view'::text,
              v.viewed_at,
              (v.recipient_first_name || ' ' || v.recipient_last_name),
              ('read "' || LEFT(l.insight_tagline, 80) || '" gifted by ' || l.gifter_name) AS detail
       FROM gift_views v JOIN gift_links l ON l.id = v.gift_link_id
       UNION ALL
       SELECT 'thanks'::text,
              v.thanked_at,
              (v.recipient_first_name || ' ' || v.recipient_last_name),
              ('thanked ' || l.gifter_name || ' for "' || LEFT(l.insight_tagline, 80) || '"') AS detail
       FROM gift_views v JOIN gift_links l ON l.id = v.gift_link_id
       WHERE v.thanked_at IS NOT NULL
       UNION ALL
       SELECT 'trial_intent'::text,
              v.trial_interest_at,
              (v.recipient_first_name || ' ' || v.recipient_last_name),
              ('clicked Start free trial while reading "' || LEFT(l.insight_tagline, 80) || '"') AS detail
       FROM gift_views v JOIN gift_links l ON l.id = v.gift_link_id
       WHERE v.trial_interest_at IS NOT NULL
     ) e
     WHERE at IS NOT NULL
     ORDER BY at DESC
     LIMIT 100`,
  );
}

export default async function AdminOverview() {
  const [stats, topGifters, topAuthors, topRecipients, activity] = await Promise.all([
    loadStats(),
    loadTopGifters(),
    loadTopAuthors(),
    loadTopRecipients(),
    loadActivity(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Usage overview</h1>
        <p className="text-sm text-ink-500 mt-1">All-time activity across Gift Insight.</p>
      </div>

      <StatGrid stats={stats} />

      <div className="grid lg:grid-cols-2 gap-8">
        <Section title="Top gifters" action={<ExportCsvButton table="gifters" />}>
          <Table
            head={['Gifter', 'Links', 'Views', 'Thanks', 'Last']}
            rows={topGifters.map((g) => [
              <span key="n" className="text-ink-900">{g.gifter_name}<span className="text-ink-400 ml-1.5 text-[11px]">{g.gifter_email}</span></span>,
              <span key="l" className="font-medium">{g.links_created}</span>,
              g.total_views,
              g.total_thanks,
              <span key="t" className="text-ink-500 text-xs">{fmtDate(g.last_link_at)}</span>,
            ])}
          />
        </Section>

        <Section title="Most-gifted authors" action={<ExportCsvButton table="authors" />}>
          <Table
            head={['Author', 'Times gifted', 'Distinct gifters', 'Views']}
            rows={topAuthors.map((a) => [
              a.insight_author_name,
              <span key="t" className="font-medium">{a.times_gifted}</span>,
              a.distinct_gifters,
              a.total_views,
            ])}
          />
        </Section>
      </div>

      <Section title="Top recipients" action={<ExportCsvButton table="recipients" />}>
        <Table
          head={['Recipient', 'Email', 'Reads', 'Thanks', 'Last read']}
          rows={topRecipients.map((r) => [
            <span key="n" className="text-ink-900">{r.recipient_first_name} {r.recipient_last_name}</span>,
            <span key="e" className="text-ink-700 text-xs">{r.recipient_email}</span>,
            <span key="r" className="font-medium">{r.reads}</span>,
            r.thanks,
            <span key="t" className="text-ink-500 text-xs">{fmtDate(r.last_read)}</span>,
          ])}
        />
      </Section>

      <Section
        title="Recent activity"
        action={
          <div className="flex items-center gap-2">
            <ExportCsvButton table="activity" label="Export activity" />
            <ExportCsvButton table="links" label="Export links" />
            <ExportCsvButton table="views" label="Export views" />
          </div>
        }
      >
        <ActivityTable rows={activity} />
      </Section>
    </div>
  );
}

function StatGrid({ stats }: { stats: Stats }) {
  const cards: Array<{ label: string; value: number; hint?: string }> = [
    { label: 'Gift links created', value: stats.total_links },
    { label: 'Distinct gifters', value: stats.distinct_gifters },
    { label: 'Recipient views', value: stats.total_views },
    { label: 'Distinct recipients', value: stats.distinct_recipients },
    { label: 'Thanks responses', value: stats.total_thanks },
    { label: 'Pro-client redirects', value: stats.pro_redirects },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white border border-ink-100 rounded-xl p-4 shadow-soft">
          <div className="text-[11px] uppercase tracking-wider text-ink-400 font-semibold">{c.label}</div>
          <div className="mt-1 text-2xl font-semibold text-ink-900 tabular-nums">{c.value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-ink-700">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="bg-white border border-ink-100 rounded-xl shadow-soft overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-ink-50">
          <tr className="text-ink-500 text-left">
            {head.map((h, i) => (
              <th key={i} className="font-medium px-4 py-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-ink-500" colSpan={head.length}>No data yet.</td>
            </tr>
          )}
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((cell, j) => (
                <td key={j} className="px-4 py-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

