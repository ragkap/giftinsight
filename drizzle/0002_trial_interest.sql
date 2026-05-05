ALTER TABLE gift_views ADD COLUMN IF NOT EXISTS trial_interest_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_views_trial_interest ON gift_views (trial_interest_at) WHERE trial_interest_at IS NOT NULL;
