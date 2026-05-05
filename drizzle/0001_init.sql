CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS gift_permissions (
  id BIGSERIAL PRIMARY KEY,
  author_account_id BIGINT NOT NULL UNIQUE,
  open_to_all BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gift_permission_grants (
  author_account_id BIGINT NOT NULL,
  gifter_account_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (author_account_id, gifter_account_id)
);
CREATE INDEX IF NOT EXISTS idx_grants_gifter ON gift_permission_grants (gifter_account_id);

CREATE TABLE IF NOT EXISTS gift_links (
  id BIGSERIAL PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  gifter_account_id BIGINT NOT NULL,
  gifter_email TEXT NOT NULL,
  gifter_name TEXT NOT NULL,
  insight_id BIGINT NOT NULL,
  insight_slug TEXT NOT NULL,
  insight_tagline TEXT NOT NULL,
  insight_author_account_id BIGINT NOT NULL,
  insight_author_email TEXT NOT NULL,
  insight_author_name TEXT NOT NULL,
  max_views INT NOT NULL,
  view_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_links_gifter ON gift_links (gifter_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_token  ON gift_links (token);

CREATE TABLE IF NOT EXISTS gift_views (
  id BIGSERIAL PRIMARY KEY,
  gift_link_id BIGINT NOT NULL REFERENCES gift_links(id) ON DELETE CASCADE,
  recipient_email CITEXT NOT NULL,
  recipient_first_name TEXT NOT NULL,
  recipient_last_name TEXT NOT NULL,
  is_pro_client BOOLEAN NOT NULL DEFAULT FALSE,
  thanked_at TIMESTAMPTZ,
  ip INET,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_views_link  ON gift_views (gift_link_id);
CREATE INDEX IF NOT EXISTS idx_views_email ON gift_views (recipient_email);

CREATE TABLE IF NOT EXISTS recipient_read_counters (
  recipient_email CITEXT PRIMARY KEY,
  read_count INT NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS monthly_link_quota (
  gifter_account_id BIGINT NOT NULL,
  year_month CHAR(7) NOT NULL,
  links_created INT NOT NULL DEFAULT 0,
  PRIMARY KEY (gifter_account_id, year_month)
);
