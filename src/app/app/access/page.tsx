import { getSession } from '@/lib/auth';
import { MyAccess } from '@/components/MyAccess';

export const dynamic = 'force-dynamic';

export default async function MyAccessPage() {
  await getSession();
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">My gifting access</h1>
        <p className="text-sm text-ink-500 mt-1">
          Insight Providers who have permissioned you to gift their work.
        </p>
      </div>
      <MyAccess />
    </div>
  );
}
