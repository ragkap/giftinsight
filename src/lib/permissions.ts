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

/** Returns true if a NEW row was inserted (so callers can fire a one-time
 *  notification); false if the (author, gifter) pair already existed. */
export async function grantPermission(authorId: number, gifterId: number): Promise<boolean> {
  const rows = await writeQuery(
    `INSERT INTO gift_permission_grants (author_account_id, gifter_account_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING author_account_id`,
    [authorId, gifterId],
  );
  return rows.length > 0;
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

export type PermissionRequest = {
  id: number;
  author_account_id: number;
  gifter_account_id: number;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  responded_at: string | null;
};

/**
 * Creates a pending request from `gifterId` to `authorId`. If a record already
 * exists for this pair, behaviour depends on the existing status:
 *   - 'pending'  → 'already_pending'
 *   - 'approved' → 'already_approved'
 *   - 'denied'   → re-opened to 'pending' (caller should re-fire the email)
 *
 * Returns the resulting state so callers know whether to email the author.
 */
export async function createPermissionRequest(
  authorId: number,
  gifterId: number,
): Promise<{ kind: 'created' | 'reopened' | 'already_pending' | 'already_approved'; requestId: number }> {
  if (authorId === gifterId) {
    throw new Error('cannot_request_self');
  }
  const inserted = await writeQuery<{ id: number }>(
    `INSERT INTO gift_permission_requests (author_account_id, gifter_account_id)
     VALUES ($1, $2)
     ON CONFLICT (author_account_id, gifter_account_id) DO NOTHING
     RETURNING id`,
    [authorId, gifterId],
  );
  if (inserted[0]) {
    return { kind: 'created', requestId: inserted[0].id };
  }

  const existing = (await writeQuery<{ id: number; status: PermissionRequest['status'] }>(
    `SELECT id, status FROM gift_permission_requests
     WHERE author_account_id = $1 AND gifter_account_id = $2`,
    [authorId, gifterId],
  ))[0];
  if (!existing) {
    // Shouldn't happen, but be safe.
    return { kind: 'already_pending', requestId: -1 };
  }
  if (existing.status === 'pending')  return { kind: 'already_pending', requestId: existing.id };
  if (existing.status === 'approved') return { kind: 'already_approved', requestId: existing.id };

  // Denied → reopen.
  await writeQuery(
    `UPDATE gift_permission_requests
     SET status='pending', created_at=NOW(), responded_at=NULL
     WHERE id=$1`,
    [existing.id],
  );
  return { kind: 'reopened', requestId: existing.id };
}

export async function listPendingRequestsForAuthor(authorId: number) {
  const rows = await writeQuery<{ id: string | number; gifter_account_id: string | number; created_at: string }>(
    `SELECT id, gifter_account_id, created_at FROM gift_permission_requests
     WHERE author_account_id = $1 AND status='pending'
     ORDER BY created_at DESC`,
    [authorId],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    gifter_account_id: Number(r.gifter_account_id),
    created_at: r.created_at,
  }));
}

export async function listOutgoingRequestsForGifter(gifterId: number) {
  const rows = await writeQuery<{
    id: string | number;
    author_account_id: string | number;
    status: PermissionRequest['status'];
    created_at: string;
    responded_at: string | null;
  }>(
    `SELECT id, author_account_id, status, created_at, responded_at
     FROM gift_permission_requests
     WHERE gifter_account_id = $1
     ORDER BY created_at DESC LIMIT 50`,
    [gifterId],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    author_account_id: Number(r.author_account_id),
    status: r.status,
    created_at: r.created_at,
    responded_at: r.responded_at,
  }));
}

/**
 * Author responds to a request. Approving inserts into gift_permission_grants
 * (idempotent — UNIQUE constraint), then updates the request status.
 * Returns { ok: false, reason } if the request doesn't belong to this author
 * or is already resolved with the same status.
 */
export async function respondToRequest(
  requestId: number,
  authorId: number,
  action: 'approve' | 'deny',
): Promise<{ ok: true; gifterId: number; newlyGranted: boolean } | { ok: false; reason: 'not_found' | 'wrong_author' | 'already' }> {
  const row = (await writeQuery<{ author_account_id: string | number; gifter_account_id: string | number; status: PermissionRequest['status'] }>(
    `SELECT author_account_id, gifter_account_id, status FROM gift_permission_requests WHERE id = $1`,
    [requestId],
  ))[0];
  if (!row) return { ok: false, reason: 'not_found' };
  if (Number(row.author_account_id) !== authorId) return { ok: false, reason: 'wrong_author' };
  const targetStatus = action === 'approve' ? 'approved' : 'denied';
  if (row.status === targetStatus) return { ok: false, reason: 'already' };

  const gifterId = Number(row.gifter_account_id);
  let newlyGranted = false;
  if (action === 'approve') {
    const insertedGrant = await writeQuery(
      `INSERT INTO gift_permission_grants (author_account_id, gifter_account_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING author_account_id`,
      [authorId, gifterId],
    );
    newlyGranted = insertedGrant.length > 0;
  }
  await writeQuery(
    `UPDATE gift_permission_requests
     SET status = $1, responded_at = NOW()
     WHERE id = $2`,
    [targetStatus, requestId],
  );
  return { ok: true, gifterId, newlyGranted };
}

export async function getPermissionState(authorId: number): Promise<PermissionState> {
  const [{ open_to_all = false } = {}] = await writeQuery<{ open_to_all: boolean }>(
    `SELECT open_to_all FROM gift_permissions WHERE author_account_id = $1`,
    [authorId],
  );
  // pg returns BIGINT as a string by default. Cast to Number so downstream
  // Map lookups against accounts.id (integer) match.
  const grantRows = await writeQuery<{ gifter_account_id: string | number; created_at: string }>(
    `SELECT gifter_account_id, created_at FROM gift_permission_grants
     WHERE author_account_id = $1 ORDER BY created_at DESC`,
    [authorId],
  );
  const grants = grantRows.map((r) => ({
    gifter_account_id: Number(r.gifter_account_id),
    created_at: r.created_at,
  }));
  return { openToAll: Boolean(open_to_all), grants };
}
