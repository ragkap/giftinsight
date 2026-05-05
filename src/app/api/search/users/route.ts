import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { searchAccountsByName } from '@/lib/insights';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!session.isInsightProvider) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });

  const rows = await searchAccountsByName(q, 10);
  return NextResponse.json({
    results: rows.map((r) => ({
      id: r.id,
      name: r.name ?? r.first_name ?? r.email,
      email: r.email,
      isInsightProvider: r.is_insight_provider,
    })),
  });
}
