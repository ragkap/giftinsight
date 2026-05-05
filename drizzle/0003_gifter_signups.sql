CREATE TABLE IF NOT EXISTS gifter_signups (
  account_id BIGINT PRIMARY KEY,
  first_signin_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  welcome_emailed_at TIMESTAMPTZ
);
