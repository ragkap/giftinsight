import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { LogoutButton } from '@/components/LogoutButton';
import { BrandMark } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect('/admin/login');
  if (!isAdminEmail(s.email)) redirect('/admin/login?error=forbidden');

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="border-b border-ink-100 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3 md:gap-6">
          <Link href="/admin" aria-label="Smartkarma — Gift Insight admin" className="inline-flex items-center gap-2 shrink-0">
            <BrandMark height={24} />
            <span className="text-[10px] tracking-[0.18em] text-ink-500 font-bold uppercase">Admin</span>
          </Link>
          <nav className="flex items-center gap-3 md:gap-5 text-sm text-ink-700">
            <Link href="/admin" className="hover:text-accent">Overview</Link>
            <Link href="/app" className="hover:text-accent">Switch to Gift</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="text-xs text-ink-500 hidden md:inline">{s.name ?? s.firstName ?? s.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">{children}</main>
    </div>
  );
}
