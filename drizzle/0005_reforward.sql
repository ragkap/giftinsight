-- The re-gift trail: each recipient can forward an insight to a small number
-- of colleagues. Forwarded links are children of the recipient's gift_views
-- row; the original gifter is preserved for attribution and notifications.
ALTER TABLE gift_links ADD COLUMN IF NOT EXISTS parent_view_id BIGINT
  REFERENCES gift_views(id) ON DELETE SET NULL;
ALTER TABLE gift_links ADD COLUMN IF NOT EXISTS parent_link_id BIGINT
  REFERENCES gift_links(id) ON DELETE SET NULL;
ALTER TABLE gift_links ADD COLUMN IF NOT EXISTS depth INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_gift_links_parent_view
  ON gift_links (parent_view_id) WHERE parent_view_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gift_links_parent_link
  ON gift_links (parent_link_id) WHERE parent_link_id IS NOT NULL;
