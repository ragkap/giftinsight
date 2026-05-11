CREATE TABLE IF NOT EXISTS gift_permission_requests (
  id BIGSERIAL PRIMARY KEY,
  author_account_id BIGINT NOT NULL,
  gifter_account_id BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (author_account_id, gifter_account_id)
);
CREATE INDEX IF NOT EXISTS idx_perm_req_author_pending
  ON gift_permission_requests (author_account_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_perm_req_gifter ON gift_permission_requests (gifter_account_id);
