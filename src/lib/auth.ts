import 'server-only';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { env } from './env';
import { readQuery } from './db-read';

export type Session = {
  accountId: number;
  email: string;
  firstName: string | null;
  name: string | null;
  isInsightProvider: boolean;
};

const COOKIE = 'sk_session';
const SESSION_DAYS = 30;

function secret() {
  return new TextEncoder().encode(env().SESSION_SECRET);
}

export async function signSession(s: Session) {
  return await new SignJWT({ ...s })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      accountId: Number(payload.accountId),
      email: String(payload.email),
      firstName: (payload.firstName as string) ?? null,
      name: (payload.name as string) ?? null,
      isInsightProvider: Boolean(payload.isInsightProvider),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  if (!t) return null;
  return await verifyToken(t);
}

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(COOKIE);
}

type AccountRow = {
  id: number;
  email: string;
  encrypted_password: string;
  name: string | null;
  first_name: string | null;
  is_insight_provider: boolean;
  is_client: boolean;
  locked_at: Date | null;
  suspended_at: Date | null;
};

export async function verifyCredentials(email: string, password: string): Promise<Session | null> {
  // Note: we deliberately do NOT require `confirmed_at IS NOT NULL` — internal
  // Smartkarma accounts are created via admin without email confirmation, so
  // the confirmed_at gate would lock out ~all employees.
  const rows = await readQuery<AccountRow>(
    `SELECT id, email, encrypted_password, name, first_name, is_insight_provider,
            is_client, locked_at, suspended_at
     FROM accounts WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email],
  );
  const a = rows[0];
  if (!a) return null;
  if (a.locked_at) return null;
  if (a.suspended_at) return null;
  if (!a.encrypted_password) return null;

  // Devise stores bcrypt hashes with $2a$ prefix; bcryptjs compares them fine.
  const ok = await bcrypt.compare(password, a.encrypted_password);
  if (!ok) return null;

  return {
    accountId: a.id,
    email: a.email,
    firstName: a.first_name,
    name: a.name,
    isInsightProvider: a.is_insight_provider,
  };
}

export async function isProClient(email: string): Promise<{ active: boolean; accountId?: number }> {
  const rows = await readQuery<{ id: number }>(
    `SELECT id FROM accounts
     WHERE LOWER(email) = LOWER($1)
       AND is_client = true
       AND (subscription_end_date IS NULL OR subscription_end_date >= CURRENT_DATE)
       AND locked_at IS NULL
       AND suspended_at IS NULL
     LIMIT 1`,
    [email],
  );
  return rows[0] ? { active: true, accountId: rows[0].id } : { active: false };
}
