import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { LogoutButton } from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect('/login');
  const isAdmin = isAdminEmail(s.email);

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="border-b border-ink-100 bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3 md:gap-6">
          <Link href="/app" aria-label="Smartkarma — Gift" className="inline-flex items-center shrink-0">
            <img
              src="/brand.png"
              alt="Smartkarma"
              width={28}
              height={28}
              className="rounded-[5px] block"
            />
          </Link>
          <nav className="flex items-center gap-3 md:gap-5 text-sm text-ink-700">
            <Link href="/app" className="hover:text-accent">Gift</Link>
            <Link href="/app/access" className="hover:text-accent">Access</Link>
            <Link href="/app/analytics" className="hover:text-accent">Analytics</Link>
            {s.isInsightProvider && (
              <Link href="/app/permissions" className="hover:text-accent">Permissions</Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
                title="Admin overview"
              >
                Admin
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="text-xs text-ink-500 hidden md:inline">{s.name ?? s.firstName ?? s.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
