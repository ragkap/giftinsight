import 'server-only';
import { writeQuery } from './db-write';

export const SMARTKARMA_EMPLOYEE_DOMAIN = 'smartkarma.com';

export function isSmartkarmaEmployee(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(`@${SMARTKARMA_EMPLOYEE_DOMAIN}`);
}

/**
 * Returns the set of author account_ids whose insights `gifterId` is allowed
 * to gift, OR `null` to indicate "no restriction" (Smartkarma employees can
 * gift any author).
 *
 * Always includes gifterId itself (you can always gift your own work).
 * `openToAll` flagged authors are included unconditionally.
 */
export async function getAllowedAuthorIds(
  gifterId: number,
  gifterEmail: string,
): Promise<number[] | null> {
  if (isSmartkarmaEmployee(gifterEmail)) return null;

  const rows = await writeQuery<{ author_account_id: string }>(
    `SELECT author_account_id FROM gift_permissions WHERE open_to_all = TRUE
     UNION
     SELECT author_account_id FROM gift_permission_grants WHERE gifter_account_id = $1`,
    [gifterId],
  );
  const ids = new Set<number>([gifterId]);
  for (const r of rows) ids.add(Number(r.author_account_id));
  return [...ids];
}

export async function canGift(
  gifterId: number,
  gifterEmail: string,
  authorId: number,
): Promise<boolean> {
  if (gifterId === authorId) return true;
  if (isSmartkarmaEmployee(gifterEmail)) return true;
  const r = await writeQuery<{ ok: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM gift_permissions WHERE author_account_id = $1 AND open_to_all = TRUE
       UNION ALL
       SELECT 1 FROM gift_permission_grants WHERE author_account_id = $1 AND gifter_account_id = $2
     ) AS ok`,
    [authorId, gifterId],
  );
  return Boolean(r[0]?.ok);
}

export async function setOpenToAll(authorId: number, openToAll: boolean) {
  await writeQuery(
    `INSERT INTO gift_permissions (author_account_id, open_to_all)
     VALUES ($1, $2)
     ON CONFLICT (author_account_id) DO UPDATE
       SET open_to_all = EXCLUDED.open_to_all, updated_at = NOW()`,
    [authorId, openToAll],
  );
}

export async function grantPermission(authorId: number, gifterId: number) {
  await writeQuery(
    `INSERT INTO gift_permission_grants (author_account_id, gifter_account_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [authorId, gifterId],
  );
}

export async function revokePermission(authorId: number, gifterId: number) {
  await writeQuery(
    `DELETE FROM gift_permission_grants WHERE author_account_id = $1 AND gifter_account_id = $2`,
    [authorId, gifterId],
  );
}

export type PermissionState = {
  openToAll: boolean;
  grants: { gifter_account_id: number; created_at: string }[];
};

export async function getPermissionState(authorId: number): Promise<PermissionState> {
  const [{ open_to_all = false } = {}] = await writeQuery<{ open_to_all: boolean }>(
    `SELECT open_to_all FROM gift_permissions WHERE author_account_id = $1`,
    [authorId],
  );
  const grants = await writeQuery<{ gifter_account_id: number; created_at: string }>(
    `SELECT gifter_account_id, created_at FROM gift_permission_grants
     WHERE author_account_id = $1 ORDER BY created_at DESC`,
    [authorId],
  );
  return { openToAll: Boolean(open_to_all), grants };
}
