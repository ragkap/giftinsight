import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';
import { BrandMark, GiftIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect('/login');

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="border-b border-ink-100 bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
          <Link href="/app" className="inline-flex items-center gap-3 text-sm group">
            <BrandMark height={22} />
            <span className="h-5 w-px bg-ink-200" aria-hidden />
            <span className="inline-flex items-center gap-1.5 font-semibold tracking-tight text-ink-900">
              <GiftIcon size={15} className="text-accent" />
              <span>Gift <span className="text-accent">Insight</span></span>
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-ink-700">
            <Link href="/app" className="hover:text-accent">Search & gift</Link>
            <Link href="/app/analytics" className="hover:text-accent">Analytics</Link>
            {s.isInsightProvider && (
              <Link href="/app/permissions" className="hover:text-accent">Permissions</Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-ink-500 hidden sm:inline">{s.name ?? s.firstName ?? s.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
