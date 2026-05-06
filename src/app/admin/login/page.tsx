import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { AdminLoginForm } from '@/components/AdminLoginForm';
import { BrandMark } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const s = await getSession();
  if (s && isAdminEmail(s.email)) redirect('/admin');

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandMark height={26} compact={false} />
          <h1 className="mt-5 text-2xl font-semibold text-ink-900 tracking-tight">
            Gift <span className="text-accent">Insight</span>{' '}
            <span className="ml-1 text-[10px] tracking-[0.18em] text-ink-500 font-bold align-super">
              ADMIN
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Restricted access. Sign in with your Smartkarma credentials.
          </p>
        </div>
        <AdminLoginForm />
      </div>
    </main>
  );
}
