import 'server-only';
import { writeQuery } from './db-write';

/**
 * Records this account's first Gift Insight sign-in. Returns true if this
 * is genuinely the first time we've seen this account → caller should send
 * the welcome email and stamp `welcome_emailed_at`.
 */
export async function recordSigninAndCheckWelcome(accountId: number): Promise<boolean> {
  const rows = await writeQuery<{ account_id: number }>(
    `INSERT INTO gifter_signups (account_id) VALUES ($1)
     ON CONFLICT DO NOTHING
     RETURNING account_id`,
    [accountId],
  );
  return rows.length > 0;
}

export async function markWelcomeEmailed(accountId: number) {
  await writeQuery(
    `UPDATE gifter_signups SET welcome_emailed_at = NOW()
     WHERE account_id = $1 AND welcome_emailed_at IS NULL`,
    [accountId],
  );
}
