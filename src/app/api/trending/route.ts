import { NextResponse } from 'next/server';
import { getTrending } from '@/lib/trending';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET() {
  const trending = await getTrending();
  return NextResponse.json({ trending });
}
