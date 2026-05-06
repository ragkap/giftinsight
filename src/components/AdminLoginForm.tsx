'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (r.ok) router.replace('/admin');
      else if (r.status === 403) setError('This email is not authorised for admin access.');
      else if (r.status === 401) setError('Invalid email or password.');
      else setError('Something went wrong. Please try again.');
    });
  }

  return (
    <form onSubmit={submit} className="bg-white border border-ink-100 rounded-2xl shadow-soft p-6 space-y-4">
      <label className="block">
        <span className="text-xs font-medium text-ink-700">Email</span>
        <input
          type="email" required autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent focus:ring-0 outline-none"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-ink-700">Password</span>
        <input
          type="password" required autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-accent focus:ring-0 outline-none"
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit" disabled={pending}
        className="w-full rounded-lg bg-ink-900 text-white text-sm font-medium py-2.5 hover:bg-ink-800 transition disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in to admin'}
      </button>
    </form>
  );
}
