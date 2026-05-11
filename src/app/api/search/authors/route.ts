import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { searchActiveIPs } from '@/lib/insights';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });

  const rows = await searchActiveIPs(q, 10);
  return NextResponse.json({
    results: rows
      .filter((r) => r.id !== session.accountId) // can't request from yourself
      .map((r) => ({
        id: r.id,
        name: r.name ?? r.first_name ?? r.email,
        company: r.company_name,
      })),
  });
}
