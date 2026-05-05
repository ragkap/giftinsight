import { getSession } from '@/lib/auth';
import { Analytics } from '@/components/Analytics';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  await getSession();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Analytics</h1>
        <p className="text-sm text-ink-500 mt-1">See who has read or thanked your gifted insights.</p>
      </div>
      <Analytics />
    </div>
  );
}
