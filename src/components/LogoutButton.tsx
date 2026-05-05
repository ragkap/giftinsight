'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

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
      className="text-xs text-ink-500 hover:text-ink-900 whitespace-nowrap"
    >
      {pending ? '…' : 'Sign out'}
    </button>
  );
}
