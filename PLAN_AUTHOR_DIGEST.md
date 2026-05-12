# Plan — Weekly "Your Insights' Reach" digest for Insight Providers

Status: **planning · v2** · Not yet implemented.

### Decisions locked (this iteration)

- **Lede analogy** — Pro-trial framing kept. Variant **B** (§2.1) for
  the one-off warm-up email; variant **C** (§2.2) for the first
  data-bearing digest each author receives. Subsequent issues open on
  the data with no lede. *(Pending final user OK on B/C.)*
- **Recipient privacy** — Firm-level cohorts shown ("read at BTIG, Citi,
  Morgan Stanley"); never individual recipient names.
- **Warm-up scope** — Start small. The warm-up email goes only to IPs
  whose work has been gifted at least once already (~20–50 people in
  beta). Not the full 1,200 active IPs.
- **Cron infra** — cron-job.org, not Railway Cron. The endpoint is the
  same; only the scheduler differs.
- **Conversion-data placeholder** — Skipped for v1. No "N readers became
  clients" line. Schema doesn't need to anticipate it now.
- **"What changed since last digest" block (old §4.4)** — Dropped.

---

## 1 · Goal

Build a weekly email to each Insight Provider whose work has been gifted in
the past 7 days. The email recaps where their research travelled — who
read it, at which firms, how many converted to a trial — framed in a way
that increases their comfort with Gift Insight rather than triggering
"my data is being leaked" anxiety.

This is the cheapest, highest-frequency growth lever we have for the
supply side: keep IPs aware that the tool exists, give them numbers they
care about (reach, conversion), and let the data itself sell the
product.

---

## 2 · Core framing — "it's the Pro trial, inverted"

Every Smartkarma IP already understands the Pro trial: sales gives a
prospect 14 days of full platform access. Gift Insight is the same
mechanic with the shape inverted:

| | Pro trial | Gift Insight |
|---|---|---|
| Who initiates | Smartkarma sales | A colleague the prospect trusts |
| What's unlocked | Whole platform, 14 days | **One insight, one read** |
| Funnel position | Top-of-funnel, broad | Mid-funnel, contextual |
| Distribution | Push (outbound) | Pull (organic forward) |

After the first issue, this preamble drops out and the data leads.

### 2.1 · Warm-up lede — variant **B** (one-off introduction email)

Used once, in the warm-up email an IP receives *before* any digest. Goal:
plain-spoken introduction, no data yet, opt-out is the bigger button.

> *Smartkarma sales runs the 14-day Pro trial to put the whole platform
> in front of a prospect. Gift Insight is the narrower cousin of that —
> one published insight, one prospect, one read.*
>
> *The idea is simple: your research already gets forwarded over Slack
> and email to people who'd value it. Gift Insight makes that path
> official — a tokenised link, a known recipient, an attributed read,
> and (when they're ready) a clean handoff to sales. You stay in
> control of who can gift your work, and you'll see the reach each week
> in an email like the one you're holding will eventually become.*
>
> *We've quietly switched it on in beta and your work is eligible. This
> note is the heads-up; the weekly recap starts only once your insights
> have actually been gifted.*

### 2.2 · Weekly digest lede — variant **C** (first data-bearing issue per author)

Used the first time an author's work has been gifted and is therefore the
first time they receive a real digest. Goal: data leads, framing is one
sentence underneath, never the headline.

> *Last week your insights reached **{N} professionals at {top-firms}** —
> the Gift Insight equivalent of a Pro trial, shrunk to one piece of
> research at a time. Below is who, where, and what they did next.*

Every subsequent issue drops even this single sentence and opens directly
on the numbers (see §4.2).

---

## 3 · Cold-start guards (the two fears)

### Fear 1 — *"My work is being shared without my knowledge."*

Address inside the email itself, not separately. Every issue carries a
**permission audit block** that mirrors `/app/permissions` so the IP can
instantly verify the actors involved:

> **You're in control.** The people who can gift your work today:
> - Smartkarma staff — 8 internal users (always permissioned during beta).
> - **3 specific people you've granted** — Lee Mitchell (BTIG), Travis
>   Lundy (Quiddity), Jon Foster (BTIG).
> - **Open to all** — OFF.
>
> [ Review or revoke → ]

If `open_to_all` is flipped on, that's flagged in bold and given a one-tap
link to flip off. **The author should never feel surprised**; everyone in
the digest data is someone the author (or Smartkarma, per the documented
employee bypass) already authorised.

### Fear 2 — *"I've never heard of this tool, and now it's emailing me about my work."*

Two stage gates:

1. **One-time warm-up email** (sent manually or as a one-off cron job
   *before* the weekly digest is enabled).  Subject: *"Quietly built for
   you — introducing Gift Insight."*  Explains the product, the controls,
   the upcoming digest. Gives an opt-out *before* the first data email.
   Targets active IPs only (published in last 6 months).
2. **Eligibility gate on the weekly digest** — only IPs whose work has
   actually been gifted in the trailing 7 days receive a digest. No
   activity, no email. This means the first digest each IP receives
   *always* contains real, concrete numbers (vs. an abstract introduction
   to a tool with zero data behind it).

Combined, an IP either:
- Sees the warm-up email first, then digests start when there's real data, **OR**
- Sees no email until their work has been gifted, at which point the
  first digest leads with the explainer block above.

Either way, there's no "what is this?" surprise.

### Fear 3 — *"I'll get a useless email every week."*

- Suppression: any week with zero new activity → no email.
- Recipient cohorts are shown as **firms not individuals**
  ("read by professionals at BTIG, Citi, Morgan Stanley"). Flatters the
  IP, sidesteps individual-tracking discomfort.
- Hard unsubscribe link, persisted to a column, honoured forever.

---

## 4 · Email structure

### 4.1 First issue per author (template `authorFirstDigestHtml`)

```
[brand mark]
GIFT INSIGHT · YOUR WEEKLY REACH

Hi {firstName},

This is your first weekly recap of how your insights are travelling
through Smartkarma's Gift Insight beta.

→ The Pro-trial analogy lede (section 2)
→ Permission audit block (section 3, Fear 1)

──────────────────────────────────────
LAST WEEK
──────────────────────────────────────

Your insights were gifted N times. Read by M unique people at
{top-firms}. P said thanks. Q clicked Start free trial.

Top performer: "{tagline}" — 5 gifts · 7 reads · 1 thanks
                              [→ View on dashboard]

[A small table or stacked rows: top 3 insights with reach numbers]

──────────────────────────────────────
GIFTERS THIS WEEK
──────────────────────────────────────

Your work was shared by:
- Lee Mitchell (BTIG) — 3 gifts
- Travis Lundy (Quiddity) — 2 gifts
- Smartkarma staff — 1 gift

──────────────────────────────────────

[Open dashboard →]   [Unsubscribe from these digests]
```

### 4.2 Subsequent issues (template `authorDigestHtml`)

Identical to the first issue minus the lede paragraph and a slimmer
permission-audit block (one line: *"3 specific grants · open-to-all OFF
· revoke any time →"*).

### 4.3 Zero-activity issues

Not sent. Eligibility query filters them out.

---

## 5 · Data model

One new table:

```sql
CREATE TABLE author_email_prefs (
  account_id            BIGINT PRIMARY KEY,
  first_digest_at       TIMESTAMPTZ,
  last_digest_at        TIMESTAMPTZ,
  unsubscribed_at       TIMESTAMPTZ,
  unsubscribe_token     TEXT UNIQUE NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- `first_digest_at` distinguishes first-issue copy from subsequent.
- `last_digest_at` lets the cron skip authors who already got this week's
  email if it runs twice for any reason.
- `unsubscribed_at` is the persistent opt-out signal; once set, the cron
  skips this account forever.
- `unsubscribe_token` lets us mint a one-click unsubscribe link without
  requiring a session.

No other schema changes — every other field comes from `gift_links`,
`gift_views`, `gift_permissions`, `gift_permission_grants`.

---

## 6 · Eligibility & query

Eligibility for a given Monday run:

```sql
WITH active_authors AS (
  SELECT DISTINCT l.insight_author_account_id AS account_id
  FROM gift_links l
  JOIN gift_views v ON v.gift_link_id = l.id
  WHERE v.viewed_at >= NOW() - INTERVAL '7 days'
)
SELECT a.account_id
FROM active_authors a
LEFT JOIN author_email_prefs p ON p.account_id = a.account_id
WHERE p.unsubscribed_at IS NULL
  AND (p.last_digest_at IS NULL OR p.last_digest_at < NOW() - INTERVAL '6 days');
```

For each eligible author, build the data payload from `gift_links` /
`gift_views`, look up the author's email + first name on the
read-replica, render the template, send via Resend.

---

## 7 · Endpoints

- `POST /api/cron/weekly-author-digest` — protected by a shared secret
  (`CRON_SECRET` env var, required in the `Authorization: Bearer …`
  header). Idempotent: re-running same Monday is a no-op for any author
  whose `last_digest_at` is within 6 days. Returns a JSON summary with
  `{ sent: number, skipped_unsubscribed: number, skipped_no_activity: number }`
  for observability.

- `GET /unsubscribe/digest?token=…` — public, no auth. Stamps
  `unsubscribed_at` on the matching row, returns a small
  "You're unsubscribed" confirmation page.

- (Optional) `POST /api/admin/digest/preview?accountId=N` — admin-only,
  returns the rendered HTML so we can sanity-check before sending. Same
  allowlist as the existing `/admin` area.

---

## 8 · Scheduling

**cron-job.org** (locked). Configured externally — the app exposes a
plain HTTP endpoint, the scheduler hits it.

- **Schedule**: every Monday 09:00 SGT (`0 1 * * 1` UTC).
- **Request**: `POST $APP_BASE_URL/api/cron/weekly-author-digest`
  with header `Authorization: Bearer $CRON_SECRET`.
- **Failure policy**: cron-job.org retries on 5xx. The endpoint is
  idempotent within a 6-day window (see §7), so retries are safe.

A new env var:

```
CRON_SECRET=… (32+ random chars, generated once)
```

The same scheduler will be re-used for the one-off warm-up endpoint
(`/api/cron/author-warm-up`) — fire once, then disable the job in
cron-job.org's UI.

---

## 9 · Compliance / unsubscribe

- Every digest carries a visible "Unsubscribe from these digests" link
  in the footer, separate from any Resend-level list-unsubscribe header.
- Unsubscribed authors never receive a digest again, even if their work
  is later gifted heavily.
- Authors can re-enable from `/app/permissions` via a small "Get weekly
  reach emails" toggle (clears `unsubscribed_at` when on).
- Unsubscribe link in the warm-up email uses the same token mechanic, so
  an author can opt out of the digest *before* ever receiving one.

---

## 10 · Roll-out

1. **Week -1** — Build everything in this plan behind a feature flag
   (no scheduler attached yet). Test by manually triggering the endpoint
   in dev / staging with realistic data.
2. **Week 0, Monday** — Send the **warm-up email** to the *narrow*
   cohort: only IPs whose work has already been gifted at least once
   (~20–50 people during beta). This is a one-off blast, not the
   digest. Subject: *"Introducing Gift Insight — your research, your
   reach."* Uses lede variant **B** (§2.1). Includes opt-out link.
   Broader fan-out to all ~1,200 active IPs is held until we've watched
   the beta cohort's response.
3. **Week 0, Tuesday-Sunday** — Watch unsubscribe rate. If <2% we're
   comfortable; if >5% we redraft the warm-up and pause the cron.
4. **Week 1, Monday 09:00 SGT** — Attach the cron. The first weekly
   digest fires to whichever IPs had ≥1 gifted read in the trailing
   7 days. First-issue copy includes the Pro-trial analogy lede.
5. **Ongoing** — Watch open rate, click-through to `/app/permissions`
   and `/app/analytics`, and unsubscribe rate week-by-week. Adjust copy
   monthly.

---

## 11 · Implementation checklist (when approved)

- [ ] Migration `0006_author_email_prefs.sql`
- [ ] `src/lib/email.ts`: `authorFirstDigestHtml`, `authorDigestHtml`,
      `authorWarmUpHtml`, all sharing a `digest-body` helper
- [ ] `src/lib/digest.ts`: eligibility query + payload builder
- [ ] `src/app/api/cron/weekly-author-digest/route.ts`
- [ ] `src/app/api/cron/author-warm-up/route.ts` (one-off; can be
      deleted after the warm-up blast)
- [ ] `src/app/unsubscribe/digest/page.tsx` + token mint helper
- [ ] `src/app/admin/(dashboard)/digest-preview/page.tsx` (admin tool)
- [ ] `.env.example`: `CRON_SECRET=`
- [ ] OpenAPI `public/openapi.yaml`: add the three new routes
- [ ] Small toggle on `/app/permissions` to flip
      `unsubscribed_at` back on/off

---

## 12 · Open questions for review

All six questions from v1 are now answered (see "Decisions locked" at
the top of this file). One remaining sign-off:

1. **Lede copy — variants B and C** (§2.1, §2.2) — do these read right,
   or want another pass? B is the only paragraph an IP will read before
   they've seen any data, so it carries the most weight. C is short by
   design — the numbers should be louder than the framing.

If both lede paragraphs are approved as-is, this plan is ready to
implement against the checklist in §11.
