# Gift Insight

Smartkarma app for gifting Insights to non-clients.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind, accent **#24a9a7**
- Postgres read-replica for `accounts` / `insights` / `entities`
- Postgres write DB (Railway plugin) for gift links / permissions / views
- bcrypt + `jose` JWT cookies for auth
- Resend for emails

## Local dev

```bash
cp .env.example .env
# fill in READ_DB_PASSWORD, DATABASE_URL, RESEND_API_KEY, SESSION_SECRET
npm install
npm run migrate
npm run dev
```

## Deploy on Railway

1. Create project from this repo (Nixpacks auto-detects Next.js).
2. Attach the **Postgres** plugin → injects `DATABASE_URL`.
3. Set env vars from `.env.example` (READ_DB_*, RESEND_API_KEY, SESSION_SECRET, APP_BASE_URL, etc.).
4. Set the start command to `npm start` (port comes from `$PORT`).
5. After first deploy: `railway run npm run migrate` (or run as a one-off job).

## Environment knobs (the user-tunable limits)

| Var | Default | What it controls |
|---|---|---|
| `GIFT_MAX_LINKS_PER_GIFTER_PER_MONTH` | 10 | How many gift links each user can create per month |
| `GIFT_MAX_VIEWS_PER_LINK` | 25 | View cap per gift link (so 250 total reads/month default) |
| `GIFT_LINK_EXPIRY_DAYS` | 30 | How long each link stays live |
| `RECIPIENT_THANKS_MODAL_THRESHOLD` | 3 | After this many reads, recipient sees the upsell modal |
| `RECIPIENT_COOKIE_DAYS` | 180 | How long to remember the recipient's name + email |

## Routes

| Path | Who |
|---|---|
| `/login` | Public — Smartkarma email + password |
| `/app` | Logged-in — search & gift |
| `/app/permissions` | Insight Providers — grant gifting access |
| `/app/analytics` | Logged-in — views, thanks, top readers, copy link |
| `/g/[token]` | Public — recipient identify form |
| `/g/[token]/read` | Public — inline read view + thanks flow |

## Notes

- The Smartkarma read-replica is **read-only**: never write to it.
- Auth verifies `bcrypt.compare(password, accounts.encrypted_password)` (Devise format).
- Pro-client check: `is_client = true AND subscription_end_date IS NULL OR >= CURRENT_DATE`.
- Insight HTML is sanitised with DOMPurify before render.
# giftinsight
