import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { PermissionsManager } from '@/components/PermissionsManager';

export const dynamic = 'force-dynamic';

export default async function Permissions() {
  const s = (await getSession())!;
  if (!s.isInsightProvider) redirect('/app');

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Gifting permissions</h1>
        <p className="text-sm text-ink-500 mt-1">
          Choose who can gift your insights. You can grant specific people, or open it to anyone.
        </p>
      </div>

      <PermissionsManager />
    </div>
  );
}
