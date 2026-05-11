import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isSmartkarmaEmployee } from '@/lib/permissions';
import { writeQuery } from '@/lib/db-write';
import { getAccountsByIds } from '@/lib/insights';

export const runtime = 'nodejs';

type AccessRow = {
  author_account_id: number;
  via: 'open_to_all' | 'specific';
  granted_at: string | null;
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (isSmartkarmaEmployee(session.email)) {
    return NextResponse.json({ isStaff: true, authors: [] });
  }

  // Open-to-all authors first, then the gifter's explicit grants. If an
  // author appears in both, the explicit grant wins (it has a granted_at).
  const openRows = await writeQuery<{ author_account_id: string | number }>(
    `SELECT author_account_id FROM gift_permissions WHERE open_to_all = TRUE`,
  );
  const grantRows = await writeQuery<{ author_account_id: string | number; created_at: string }>(
    `SELECT author_account_id, created_at FROM gift_permission_grants
     WHERE gifter_account_id = $1 ORDER BY created_at DESC`,
    [session.accountId],
  );

  const byId = new Map<number, AccessRow>();
  for (const r of openRows) {
    const id = Number(r.author_account_id);
    byId.set(id, { author_account_id: id, via: 'open_to_all', granted_at: null });
  }
  for (const r of grantRows) {
    byId.set(Number(r.author_account_id), {
      author_account_id: Number(r.author_account_id),
      via: 'specific',
      granted_at: r.created_at,
    });
  }

  const ids = Array.from(byId.keys());
  const accounts = ids.length ? await getAccountsByIds(ids) : [];
  const accountById = new Map(accounts.map((a) => [Number(a.id), a]));

  const authors = ids
    .map((id) => {
      const a = accountById.get(id);
      const row = byId.get(id)!;
      return {
        id,
        name: a?.name ?? a?.first_name ?? a?.email ?? `User ${id}`,
        company: a?.company_name ?? null,
        via: row.via,
        grantedAt: row.granted_at,
      };
    })
    .sort((a, b) => {
      // Specific grants first (newest first), then open-to-all alphabetically.
      if (a.via !== b.via) return a.via === 'specific' ? -1 : 1;
      if (a.via === 'specific') {
        return (b.grantedAt ?? '').localeCompare(a.grantedAt ?? '');
      }
      return a.name.localeCompare(b.name);
    });

  return NextResponse.json({
    isStaff: false,
    isInsightProvider: session.isInsightProvider,
    authors,
  });
}
