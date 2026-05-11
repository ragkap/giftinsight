'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LogoutIcon } from '@/components/icons';

export function LogoutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() =>
        start(async () => {
          await fetch('/api/auth/logout', { method: 'POST' });
          router.replace('/login');
        })
      }
      disabled={pending}
      aria-label="Sign out"
      title="Sign out"
      className="text-xs text-ink-500 hover:text-ink-900 whitespace-nowrap inline-flex items-center gap-1.5 disabled:opacity-60"
    >
      {pending ? (
        <span>…</span>
      ) : (
        <>
          <LogoutIcon size={16} className="md:hidden" />
          <span className="hidden md:inline">Sign out</span>
        </>
      )}
    </button>
  );
}
