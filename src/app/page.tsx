import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function Index() {
  const s = await getSession();
  redirect(s ? '/app' : '/login');
}
