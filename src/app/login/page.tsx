import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { LoginForm } from '@/components/LoginForm';
import { BrandMark, GiftIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const s = await getSession();
  if (s) redirect('/app');
  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandMark height={28} />
          <h1 className="mt-4 text-2xl font-semibold text-ink-900 tracking-tight inline-flex items-center gap-2">
            <GiftIcon size={22} className="text-accent" />
            <span>Gift <span className="text-accent">Insight</span></span>
          </h1>
          <p className="mt-1 text-sm text-ink-500">Sign in with your Smartkarma credentials.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
