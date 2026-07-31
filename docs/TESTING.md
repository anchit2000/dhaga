# Testing Dhaga — deploy it, then click through it

This is a manual, step-by-step guide for taking Dhaga from zero to a fully
clicked-through app: first deploy, first account, first admin, and every
shipped product feature. Automated unit/e2e tests are tracked separately
([checklist.md](checklist.md) §0) — this doc is for a human in a browser.

**How to read the confidence markers below:** every claim here was checked
against the actual source file cited next to it (not against what an older
version of this doc, or `SELF_HOSTING.md`/`DEPLOYING.md`, merely *said*).
Where a behavior can only really be confirmed by running it — a live Stripe
test purchase, an actual Supabase project, a real Vercel deploy, Docker on a
machine that has it — it's marked **unverified (needs a live run)**. Treat
those as correct instructions to follow, not as outcomes already confirmed.
Nothing in this pass had a live Anthropic/Stripe/Supabase/Firecrawl
credential or a Docker daemon available, so anything gated on those is
necessarily in that bucket.

---

## 1. Pick a deploy path

| Path | What it's for | Admin panel / hosted-mode features |
|---|---|---|
| **Vercel (Hobby/free) + Supabase (free)** — §1a | The realistic target: this is what you're actually deploying to | Yes, if you add the extra env vars in §3 |
| **Local dev, embedded DB (PGlite)** — §1b | Fastest loop for the core product (capture/notes/search/drafts/export) | **No** — needs real Postgres, see §3 |
| **Docker Compose** — §1c | Self-host on your own box later | Not wired by default; needs manual edits, see §1c |

### 1a. Vercel (Hobby) + Supabase (free) — recommended path

**Step 1 — create the Supabase project.** Free tier, any region.

**Step 2 — get `DATABASE_URL`.** In Supabase: Project Settings → Database →
Connection string → pick the **Session** pooler mode (port `5432` on the
pooler host, like `aws-0-<region>.pooler.supabase.com`) — NOT the
Transaction pooler (port `6543`). An earlier revision of this guide
recommended 6543 because Vercel serverless functions open many short-lived
connections and transaction-mode multiplexing handles that best. A live run
then proved transaction pooling breaks this app: tenant scoping rides on
session-level `set_config('app.current_user_id', …)`, and transaction mode
re-assigns the server backend between queries — RLS intermittently returns
zero rows, and the tenant setting can leak onto backends later handed to
other clients. The app now refuses to boot on 6543 (fail-loud guard in
`packages/ee/src/db/bootstrap.ts`). The session pooler still pools (it
handles Vercel's many instances far better than direct connections), while
pinning one backend per client so session state is safe; the app frees its
slots quickly (small per-instance `max`, and tenant-scoped clients are
discarded after each request). When warm instances briefly overshoot the
shared 15 and the pooler rejects a new backend (`EMAXCONNSESSION` / `max
clients reached`, or node-postgres' `timeout exceeded when trying to
connect`), connection acquisition now retries the transient rejection with
backoff+jitter instead of 500ing (`connect-retry.ts` in both
`packages/ee/src/db/` and `apps/web/src/lib/db/`; tune with
`DB_CONNECT_RETRY_MAX` / `DB_CONNECT_RETRY_BASE_MS`). That is a graceful
safety net, not more capacity: if session-pooler slots run out under
sustained load, the durable lever is raising `pool_size` in Supabase's pooler
settings (see docs/SCALING.md §2). Session mode stays required — the durable
fix for the double-connection hold (transaction-scoped tenancy) is tracked as
a follow-up on PR #11.

**Step 3 — pgvector.** You should *not* need to touch the Supabase SQL
editor yourself: the app's own idempotent schema DDL runs
`CREATE EXTENSION IF NOT EXISTS vector;` every
time the DB is opened (`apps/web/src/lib/db/ddl/vector.ts`, executed by
`initHosted()` in `apps/web/src/lib/db/index.ts:62-67` on first request —
there is no separate migration step). Supabase's own docs say pgvector is
available on every plan including free, and that the extension can be
enabled either via their dashboard or by running the `CREATE EXTENSION` SQL
directly. **Unverified (needs a live run):** whether the default `postgres`
role in a fresh Supabase project has the grant to run that DDL itself
without you first flipping the toggle. If the app errors out on first
request with a permissions-flavored Postgres error, go to Supabase
Dashboard → Database → Extensions → enable **vector** yourself, then reload.

**Step 4 — Vercel project.** Import the GitHub repo, set **Root Directory**
to `apps/web`, keep the default Next.js build command.

**Step 5 — env vars** (Project Settings → Environment Variables):

| Var | Required? | Why |
|---|---|---|
| `DATABASE_URL` | **Yes** | From step 2. Without it, `getDb()` falls back to embedded PGlite (`apps/web/src/lib/db/index.ts:84-90`), which needs a writable filesystem — Vercel's is read-only/ephemeral, so `/app` cannot store anything without this var set. |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Yes | Auth cookie/session signing; `BETTER_AUTH_URL` is your `*.vercel.app` URL or custom domain. |
| `DHAGA_EMBEDDINGS=off` | Recommended | The local semantic-search embedding model is a heavy native runtime, a poor fit for serverless functions; search still works via keyword matching without it. |
| `ANTHROPIC_API_KEY` | No (your own key, add whenever) | Every AI feature has a documented degraded mode without it — see the table in §8. |
| `FIRECRAWL_API_KEY`, `CRON_SECRET` | No | Only needed for the job-change/news signal sweep (§7j). |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `DHAGA_OWNER_EMAIL` | No | Only for event-digest / waitlist emails. |
| `DHAGA_HOSTED_MODE`, `DHAGA_ADMIN_EMAILS`, `STRIPE_*` | No, add later | Skip for now — add these once you want to test the admin panel; see §3. |

**Step 6 — deploy, then check function duration isn't a concern.**
Confirmed against Vercel's current docs (fetched during this pass, dated
2026-07-01): **Fluid Compute is on by default for new projects**, which
gives the Hobby plan a 300-second (5 minute) default *and* maximum duration
per function invocation — comfortably above the low-single-digit-second
calls this app makes to Claude for extraction/search/drafts. If your project
predates Fluid Compute and it's somehow off, the legacy non-Fluid Hobby
ceiling was much shorter and AI calls could 504
(`FUNCTION_INVOCATION_TIMEOUT`); check Project Settings → Functions →
Fluid Compute is enabled if you ever see that error.

**Step 7 — cron (optional, only if you want job-change/news detection).**
`apps/web/vercel.json` declares one cron job: `/api/jobs/detect-signals` on
schedule `17 6 * * *` (once daily). Confirmed against Vercel's current docs:
**Hobby accounts are limited to at-most-once-daily cron schedules** —
anything more frequent fails at deploy time — so this project's single
once-a-day job fits the Hobby tier as-is. Vercel notes it may run the job at
any point within the scheduled hour, not the exact minute. The route always
401s unless `CRON_SECRET` is set (fails closed by design — see §7j).

**Resetting to blank on this path:** unlike local PGlite, there's no folder
to delete — start a fresh Supabase project. On a throwaway project you could
instead `TRUNCATE` the app's tables from the SQL editor (`contacts`, `notes`,
`facts`, `edges`, `events`, `embeddings`, etc. — see
`apps/web/src/lib/db/ddl/core.ts` for the full list; the `user`/`session`/
`account` auth tables are separate and truncating them signs everyone out).
**Never against Dhaga's own Supabase instance**, which holds data that cannot
be recreated — nothing deletes from it (see CLAUDE.md). For a disposable graph
use local PGlite (§1b) or the local Docker Postgres.

### 1b. Local dev — fastest loop for the core product only

```bash
npm install
npm run dev        # serves http://localhost:3000
```

`apps/web/.env.local` (gitignored) must exist:

```
BETTER_AUTH_SECRET=<long random>    # auth cookie/session signing secret
BETTER_AUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...        # OPTIONAL — enables the AI paths
```

No `DATABASE_URL` set → the app uses the embedded PGlite database on disk
(`apps/web/src/lib/db/index.ts:70-82`, `apps/web/.dhaga-data/` by default,
override with `DHAGA_DATA_DIR`). **This mode cannot show the admin panel or
any hosted-mode feature at all**, regardless of env vars you set — see §3 for
why (`packages/ee`'s own Postgres pool throws immediately if `DATABASE_URL`
is unset, and `/app/admin` 404s unconditionally without
`DHAGA_HOSTED_MODE=true`). Use this path for §7's core-product walkthrough;
use §1a or a real Postgres for §3–§6.

**Reset to a blank database:** stop the dev server, delete
`apps/web/.dhaga-data/`, restart.

### 1c. Docker Compose — exists, unverified in this pass

The repo root has a [`Dockerfile`](../Dockerfile) and
[`compose.yml`](../compose.yml) (single-stage Node 22 image + a
`pgvector/pgvector:pg17` Postgres service with healthchecks). **No local
Docker was available in any session that has touched this repo so far — the
compose files have never actually been run end-to-end.** Read-through says
they're complete and idempotent (same first-request DDL as §1a), but treat
this path as unverified-by-execution until someone actually runs it.

```bash
# next to compose.yml, create .env:
#   BETTER_AUTH_SECRET=<openssl rand -base64 32>
docker compose up --build
```

Important gap if you want to test hosted-mode/admin here: **`compose.yml`
does not wire `DHAGA_HOSTED_MODE`, `DHAGA_ADMIN_EMAILS`, or any `STRIPE_*`
var into the `web` service's environment** (confirmed by reading
`compose.yml:30-41` — only `DATABASE_URL`, `BETTER_AUTH_*`,
`ANTHROPIC_API_KEY`, `RESEND_*`, `DHAGA_OWNER_EMAIL`,
`DHAGA_AI_MONTHLY_CAP`, `SEARCH_PROVIDER`, `FIRECRAWL_API_KEY`,
`CRON_SECRET` are passed through). This is the plain self-host path only —
to test §3–§6 via Docker you'd need to add those vars to `compose.yml`'s
`web.environment` block yourself first.

---

## 2. First visit → sign up

- [ ] `/` renders; scroll the feature story — desktop and phone mockups swap
      as the story progresses; no horizontal scroll at 375px.
- [ ] `/app/people` while signed out → redirected to `/login`
      (`requireUserIdForPage`, `apps/web/src/lib/auth/guard.ts:21-25`).
- [ ] **Plain mode** (`DHAGA_HOSTED_MODE` unset — true for §1b, and for §1a
      until you add the vars in §3): `/signup` creates an account
      immediately and lands on **People**. Refresh — still signed in.
- [ ] Wrong password on `/login` → error stays on the form.
- [ ] `curl -s -o /dev/null -w "%{http_code}" <url>/api/export/csv` →
      `401` (API routes are gated too — confirmed: `GET` in
      `apps/web/src/app/api/export/[format]/route.ts` calls
      `requireUserIdFromRequest` before it reads anything).
- [ ] Sign out (top right) → back to `/login`, and `/app/people` redirects
      again.

If `DHAGA_HOSTED_MODE=true` is already set at this point, plain signup
behaves differently — see §3 and §5 instead of the bullet above.

---

## 3. Turning on Dhaga Cloud features + becoming the first admin

Everything in this section (admin panel, gated signup, billing) is
`packages/ee` — inert by default. It needs **all three** of:

1. A real Postgres `DATABASE_URL` (Supabase from §1a, or any Postgres) —
   confirmed by reading `packages/ee/src/db/pool.ts:12-21`: it throws
   `"DATABASE_URL is required for DHAGA_HOSTED_MODE (packages/ee needs real
   Postgres — PGlite has no RLS)"` if the var is unset. This is the one
   thing local PGlite-only dev (§1b) can never satisfy.
2. `DHAGA_HOSTED_MODE=true` — the master switch. Without it, every one of
   the four extension points in `apps/web/src/lib/hosted/gate.ts` falls back
   to its permissive/inert default (open signup, no billing UI, no admin
   access) before `@dhaga/ee` is even imported.
3. `DHAGA_ADMIN_EMAILS=you@yourdomain.com` (comma-separated for more than
   one) — set in the **same** `apps/web/.env.local` / Vercel project env
   vars core reads (`packages/ee` has no separate env file at runtime; its
   own `.env.example` is just a documentation copy of the same var names).

There's a deliberate chicken-and-egg problem this var exists to solve: the
admin panel can only promote someone to admin if you're already an admin,
and in hosted mode signup is gated behind an approved access request, which
normally only an admin can approve. `DHAGA_ADMIN_EMAILS` breaks the circle:

- [ ] With the three vars above set, go to `/signup` and create an account
      with the **exact** email in `DHAGA_ADMIN_EMAILS`. Confirmed
      (`packages/ee/src/access-requests/index.ts:11-21`): the signup gate's
      `checkEmail` short-circuits to `{ allowed: true }` for bootstrap-admin
      emails specifically, bypassing the access-request check that would
      otherwise block a brand-new email — this is the one case where signup
      works with zero prior approval.
- [ ] You're an admin immediately, no manual DB flip — confirmed
      (`packages/ee/src/admin/repo.ts:14-25`): `isUserAdmin` checks
      `DHAGA_ADMIN_EMAILS` in addition to the stored `isAdmin` column, so
      matching the env var is sufficient on its own.
- [ ] `/app/admin` now loads instead of 404ing.
- [ ] `DHAGA_ADMIN_EMAILS` is safe to leave set permanently as a break-glass
      path — it's env config, not a stored credential.

---

## 4. Admin panel walkthrough (needs §3)

- [ ] **`/app/admin`** — dashboard: three stat cards (pending access
      requests, total users, active subscriptions), each links through
      (`apps/web/src/app/app/admin/page.tsx`).
- [ ] **`/app/admin/access-requests`** — tabs for pending/approved/rejected;
      **Approve**/**Reject** buttons appear only on the pending tab.
- [ ] **`/app/admin/users`** — table of every user (name/email/joined date,
      an "admin" badge if applicable); click a row → `/app/admin/users/[id]`.
- [ ] **`/app/admin/users/[id]`** — AI usage this month vs. their cap
      (`N / unlimited` if they have an active paid subscription, else
      `N / No AI (free tier)`), their subscription plan+status if any, a
      **Grant credits to this user** card (see §4a), and a
      **Make admin** / **Revoke admin** toggle button. When that user has
      active grants, a second line reads **"+N granted"** — usage above it is
      what was actually spent, and grants never change it.
- [ ] **`/app/admin/subscriptions`** — table of every subscription
      (user link, plan, status, renewal date).
- [ ] Sign out of the admin account, sign in as (or create) a **non-admin**
      account, visit any `/app/admin/*` URL → **404**, not a redirect.
      Confirmed deliberate (`apps/web/src/app/app/admin/layout.tsx:14-18`):
      "a non-admin shouldn't be able to distinguish 'doesn't exist' from
      'exists but you're blocked'."
- [ ] With `DHAGA_HOSTED_MODE` unset entirely (§1b or plain §1a), `/app/admin`
      404s for *every* account including one listed in `DHAGA_ADMIN_EMAILS`
      — there is no way to reach this section at all outside hosted mode.

---

### 4a. AI credit controls (`/app/admin/ai-credits`, needs §3)

The instance-wide AI-credit levers. Reach them from the **AI credits** card
sitting under the three stat cards on `/app/admin` ("Plan allowances, a
promotional month, and make-good grants"). The page header restates the
precedence the resolver actually uses (`apps/web/src/lib/ai/metering/cap.ts`),
highest first:

> per-user override → active promotion → plan allowance (only with the master
> switch on, and only when a plan is in play) → `DHAGA_AI_MONTHLY_CAP` → free
> tier — then **active grants are added on top of whichever one wins**.

**Nothing about today's behaviour changes until an admin turns enforcement
on.** That is the whole safety story of this screen: with the switch off, paid
plans still resolve through `hasUnlimitedAi` exactly as in §6, and the pricing
page still sells Pro and Annual as "no monthly cap".

- [ ] **Plan-cap enforcement** (first card) reads **Off** on a fresh instance
      (`AI_PLAN_CAP_ENFORCEMENT_DEFAULT = false`,
      `apps/web/src/utils/constants/ai-budget.ts`), with the copy: *"Limits are
      not being enforced. The allowances below are stored but ignored: paid
      plans bypass the cap entirely, exactly as they do today… Turning this on
      gives every existing paying customer a ceiling they were never sold — a
      pricing decision, not a metering one."* Toggle it on and the copy flips
      to *"Limits are being enforced… The pricing page still says Pro and
      Annual have no monthly cap — change that copy, or turn this back off."*
      Turn it back **off** when you're done poking at it.
- [ ] **Monthly allowance per plan** — the editable ladder (`Free`, `Pro`,
      `Lifetime / Annual`, and `Power (sized, not sold)`), each with **Use
      default** / **Custom monthly credits** / **No cap**. Defaults come from
      `PLAN_AI_CREDITS_PER_MONTH` in `apps/web/src/utils/constants/plans.ts`,
      so "Use default" is not a stored number. With enforcement off the card
      says so: *"Stored but not applied while enforcement is off."*
- [ ] **Promotional month** — one allowance for every user on the instance
      ("everyone gets 1000 credits this month"), with a start date, an end
      date and a note. It **ends at the start of the end date** (exclusive),
      so pick the first day it should *no longer* apply; expiry is evaluated
      on every read, so nobody has to remember to undo it. A promotion applies
      whether or not enforcement is on, and a per-user override still beats
      it. Clear the credits field to end it.
- [ ] **Grant credits** — the additive make-good. *"Added on top of whatever
      cap applies. Recorded usage is never changed — a grant repairs the
      ceiling, not the history."* Blank user id = every user on the instance;
      a reason is required; the expiry defaults to the first of next month
      (blank = never expires, so it repeats every month). The same card is
      pinned to one user on `/app/admin/users/[id]`.
- [ ] **Grant ledger** — every grant ever made, newest first, with who/when/
      how many/why and an **End now** button on active ones. "End now" sets
      `ends_at`; it never deletes the row, and `ai_actions` is untouched by
      any of it.
- [ ] Automated: the precedence above is pinned by two vitest files —
      `apps/web/src/lib/__tests__/ai-action-metering/budget-precedence.test.ts`
      (every rung, plus "master switch off ⇒ byte-for-byte the old behaviour")
      and `promotion-and-grants.test.ts` (a promotion self-expires; a grant
      raises the ceiling without touching recorded usage). Run them with
      `npm run test --prefix apps/web -- ai-action-metering`.

**Getting a server up for this walkthrough.** `next dev` is unreliable on this
box (leaked Turbopack workers eventually exhaust memory), so the recipe that
has actually worked is a production build served on a free port and driven by
the Playwright harness in `apps/web/e2e` — the config reuses an
already-running server whenever `E2E_BASE_URL` points at one, instead of
starting its own:

```bash
cd apps/web
npx next build
npx next start -p 3021          # any free port
# in another shell, against that port:
E2E_BASE_URL=http://localhost:3021 E2E_HEADLESS=1 npm run test:e2e
```

Admin screens still need §3's env (`DHAGA_HOSTED_MODE=true`,
`DHAGA_ADMIN_EMAILS`, real Postgres) on the server you start — embedded PGlite
can't serve them.

---

## 5. Access-request flow, end to end (needs §3, a non-admin test email)

Two independent entry points converge on the same `access_requests` table
(`onConflictDoNothing` — idempotent, no duplicate/reset on retry):

- [ ] **Landing-page form**: on `/`, submit an email via the "Request
      access" form (`components/landing/RequestAccessForm.tsx`, posts to
      `POST /api/access-requests`) → success message "Request received —
      we'll email you when you're approved." Confirmed this route 404s if
      `DHAGA_HOSTED_MODE` isn't `"true"` (`apps/web/src/app/api/access-
      requests/route.ts:26-31`), so don't expect this to do anything outside
      hosted mode.
- [ ] **Or just try `/signup`** with an email that hasn't been approved and
      isn't in `DHAGA_ADMIN_EMAILS`: better-auth's `databaseHooks.user.create
      .before` hook (`apps/web/src/lib/auth/config/index.ts:44-59`) calls the
      same `checkEmail`, and on rejection **automatically files the same
      access request** and throws a `FORBIDDEN` error with the reason shown
      on the signup form — you don't need to separately use the landing
      form first; a blocked signup attempt *is* an access request.
- [ ] Sign in as the admin from §3 → `/app/admin/access-requests` → pending
      tab shows that email.
- [ ] Click **Approve** → confirmed (`packages/ee/src/access-requests/
      repo.ts:43-57`) this flips `status` to `approved`. The email address
      can now complete `/signup` successfully (`isEmailApproved` check in
      `signupGate.checkEmail` now passes).
- [ ] Click **Reject** (on a different pending email) instead → status
      flips to `rejected`; that email is still blocked from signing up.
      **Not confirmed by reading the code:** whether re-submitting a
      rejected email's access request is possible or silently stays rejected
      forever — `submitAccessRequest`'s `onConflictDoNothing` suggests a
      second request for the same email is a no-op regardless of its current
      status, so a rejected user may need an admin to flip them back to
      pending manually via direct DB access; there's no "re-request" UI
      affordance found. Worth confirming by actually clicking through it.
- [ ] With `RESEND_API_KEY`/`RESEND_FROM_EMAIL` set: approving sends the
      approved email a "You're in" email with a `/signup?email=...`
      deep link that pre-fills the signup form
      (`apps/web/src/lib/access/notify.ts:9-21`). Without Resend configured,
      this is a silent no-op (`emailEnabled()` guard) — the approval still
      works, there's just no email.

---

## 6. Stripe test-mode checkout (needs §3 + Stripe test-mode keys)

Env vars, all from the Stripe Dashboard in **test mode**:
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_ANNUAL`,
`STRIPE_PRICE_LIFETIME` (Price IDs from Products you create yourself in test
mode). Register a webhook pointing at `<url>/api/stripe/webhook`, subscribed
to at least `checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.payment_failed`.

- [ ] **Billing UI cleanly absent when `STRIPE_SECRET_KEY` is unset**, even
      with `DHAGA_HOSTED_MODE=true` — confirmed
      (`packages/ee/src/billing/index.ts:10-13`): `getPlanSummary` returns
      `null` if the key is missing, and the settings page
      (`apps/web/src/app/app/settings/page.tsx:33`) renders nothing at all
      when that's `null` — not a broken "Upgrade" button, no section.
- [ ] With the key set: `/app/settings` shows a billing section; **Upgrade
      to Pro** / **Lifetime** → Stripe-hosted checkout
      (`createCheckoutUrl`, `packages/ee/src/billing/checkout.ts:8-25`).
- [ ] **Unverified (needs a live run):** complete a test-mode purchase with
      Stripe's [test card `4242 4242 4242 4242`](https://docs.stripe.com/testing)
      → redirected to `/app/settings?checkout=success` → webhook fires →
      subscription row created → AI action cap becomes "unlimited" for that
      user (`hasUnlimitedAi`, same file, checked against `active` status and
      `pro`/`lifetime` plan). Nobody has run an actual Stripe test purchase
      against this code yet — the webhook handler is typechecked/tested but
      not click-verified end to end.
- [ ] **Manage billing** → Stripe billing portal
      (`createPortalUrl`) → cancel/change plan → webhook updates the
      subscription row accordingly. Also unverified by a live run.
- [ ] `/app/admin/subscriptions` and the user's admin detail page reflect
      the new subscription (see §4).

---

## 7. Core product walkthrough (works today regardless of deploy path)

### 7a. People (manual CRUD)

- [ ] People → **Add person** → save with just a name → detail page opens.
- [ ] Add another with title/company/emails — the People list shows
      "title · company"; the filter box narrows by name, title, and company.
- [ ] Empty-state cards appear when the list/filter has no results.

### 7b. Quick add (capture → review → save)

Paste this into **Quick add**:

```
Nisha Shah
Principal, Early Stage — Meridian Capital
nisha@meridian.vc | +65 9123 4567
meridian.vc · linkedin.com/in/nishashah
Singapore
```

- [ ] Click **Extract contact** — a badge says *Extracted with AI* (key set)
      or *Parsed offline* (no key) — confirmed exact wording in
      `apps/web/src/components/app/QuickAddForm/QuickAddResult.tsx:31` and
      `apps/web/src/lib/ai/contact-extraction.ts:32`. Fields are pre-filled;
      fix anything wrong.
- [ ] Type a new event name (e.g. `Web Summit 2026`) in the event
      picker, then **Save person**.
- [ ] On the new contact: the event chip appears, and the pasted text is
      stored as a **capture source** note — that's the receipt for the
      fields.
- [ ] With a key **and AI enabled** (a paid subscription, or
      `DHAGA_AI_MONTHLY_CAP` set on a self-host): the "N of {cap} AI actions
      used" counter (confirmed `apps/web/src/app/app/quick-add/page.tsx`, cap
      from `monthlyAiCap()` — default `0`, cloud AI is a paid feature,
      `FREE_TIER_AI_CREDITS_PER_MONTH`, `apps/web/src/utils/constants/app.ts`)
      increased by one. On the free tier with no override the line instead
      reads "Cloud AI is a paid feature".

### 7c. Card photo scan (needs `ANTHROPIC_API_KEY`)

- [ ] Open Quick add on your **phone** browser (same network:
      `http://<your-ip>:3000` locally, or your deployed URL) → **Card
      photo** tab → take a photo of a real business card. Fields extract
      into the review form; a receipt note is composed from those fields
      (`cardReceiptText`) and saved with the photo.
- [ ] **The receipt fills in afterwards**: right after saving, the receipt note
      lists only the extracted fields. Wait ~5s and reload — the SAME note (one
      receipt, not two; the photo still attached) now holds the card's verbatim
      text, including whatever maps to no field: the office address, the fax
      line, the tagline. That is a second Haiku call scheduled with `after()`
      once the save has committed (`scheduleCardTranscription`), so it costs the
      scan zero user-facing latency. If the note never changes, check the server
      log for `cardTranscription` — a budget refusal is silent by design.
- [ ] **Speed**: click Scan → review dialog in **under ~3s** (measured 3.1s
      end-to-end locally, of which ~2.3s is the model). The scan asks for
      fields ONLY — it used to also request a verbatim transcription of the
      card, which tripled output tokens and took it to ~6s. If you reinstate
      any long free-text field in `cardScanSchema`, re-measure: that is the
      one change that reliably breaks this budget. Image size is the other
      lever (`CARD_SCAN_MAX_DIMENSION`, 1024) — 768px started misreading
      digits in phone numbers, so don't go lower without re-checking accuracy.
- [ ] **Tray resets**: after a scan is saved or dismissed, reopen Card photo —
      the tray is EMPTY. It used to keep the previous card's photos, so the
      next scan silently merged two people's cards into one contact.
- [ ] **Bare-domain website**: scan a card whose site is printed as
      `pune.stpi.in` (no `https://`). It saves. The link field is `type="url"`,
      so the scheme-less value used to fail native validation and the Save
      button did nothing with no message — `withUrlScheme` now adds the scheme
      at the capture→profile boundary.
- [ ] After saving: the person's page shows the photo under **Card photo**
      (the visual receipt). Clicking it opens the full-size image.
- [ ] Desktop: choose an image file instead — same flow.
- [ ] **Multi-image**: add several photos in one capture — front **and** back
      of the same card (or several leaflet pages) via multi-file select or the
      thumbnail tray's "Add photos". They extract into a **single** merged
      contact (e.g. name/title from the front, address/phone from the back),
      and after saving **every** image appears as its own receipt on the
      person's page. Removing a thumbnail before scanning drops that image;
      the count reads `n/6` and "Add" disables at six.
- [ ] **Desktop live webcam**: "Use live camera" → allow camera → take
      multiple shots (each drops into the tray) → Done → Scan — same merge
      into one contact. Denying the permission shows a message and a
      "Choose a photo instead" fallback.
- [ ] **Dock camera**: the capture dock's **Camera** button → shoot several
      frames → **Done** → the capture dialog opens on **Card photo** with those
      frames already in the tray (crop / reorder / remove available); pressing
      **Scan** starts the extraction. Done never scans blind.
- [ ] **Scanning feedback**: from the moment **Scan** is pressed until the
      review dialog opens, a branded loader blocks the WHOLE viewport — the
      capture dialog blanks out behind it (React hides home's re-suspended
      `HomeDock` boundary for the duration of the action, which is why the
      overlay lives in the app shell, not in the form; see `BusyOverlay`).
      Same for a dock **Upload**, which scans with that dialog shut, and for a
      paste extraction. Covered by `apps/web/e2e/capture-loader.spec.ts`.
- [ ] The overlay always CLEARS — on a successful scan, on a failed one, and
      with a full six-image tray. A scrim that outlives its work freezes the app
      (a 120s safety timeout is the backstop, not the mechanism).
- [ ] Without a key: honest "Card scanning needs cloud AI" error
      (`hasLLM()` gate, `apps/web/src/lib/ai/card-scan.ts:30`).

### 7d. Card-photo storage setting (Settings page)

- [ ] **Settings** → "Store captured photos" is ON by default; the Quick add
      photo tab says the photo is kept as the visual receipt.
- [ ] Toggle it OFF → the Quick add photo tab now says the photo is not
      stored; scan a card → the saved contact has no Card photo section
      (the field-derived receipt note is still there).
- [ ] Toggle back ON, scan again → the photo appears on the contact.
- [ ] **Delete all stored card photos** → confirm → the count clears and
      contacts keep their receipt notes but lose the photos.
- [ ] Deleting a scanned contact's receipt note (or the person) removes its
      photo too — `/api/card-image/<id>` returns 404 afterwards (confirmed
      `apps/web/src/app/api/card-image/[id]/route.ts:25`).

### 7e. Events

- [ ] **Events** lists `Web Summit 2026` with a people count.
- [ ] Open it — Nisha is listed; click through back to her page.
- [ ] Create a second event from the Events page directly.

### 7f. Notes → facts with receipts (needs the API key for extraction)

On a contact, add this note:

> Runs ops for a freight forwarder. They're evaluating route-optimisation AI
> next quarter, and she introduced me to their CTO. Follow up after their
> fiscal year starts.

- [ ] Note saves instantly; message reports how many facts/follow-ups were
      extracted (or explains why not, without a key —
      `apps/web/src/lib/ai/note-extraction.ts:30` gates on `hasLLM()`).
- [ ] **Facts** show with type labels and "from note, {date}" receipts.
- [ ] **Follow-ups** shows the action with the timing hint; the checkmark
      marks it done.
- [ ] Delete a single fact — only it disappears (its embedding is also
      cleaned up — `deleteFact` owns this itself, per a same-event fix).
- [ ] Delete the note — its remaining derived facts disappear with it
      (receipts invariant: no fact outlives its source), and the note's own
      embeddings go with it too (`deleteNote` owns this cleanup directly, same fix).

### 7g. Voice notes & pre-meeting brief

- [ ] On a contact, tap **Voice note** (Chrome/Edge) — allow the mic, talk,
      tap stop. The transcript lands in the textarea; **Add note** saves it
      labelled *voice note*, and facts extract as usual.
- [ ] With a key: **Brief me** — a WHO / WHAT MATTERS / OPEN LOOPS / OPENERS
      dossier under 180 words (confirmed
      `packages/core/src/llm/prompts/brief.ts:17`), drawn only from your
      notes; empty areas say "nothing on file" rather than inventing.

### 7h. Search (hybrid: keyword + local semantic)

- [ ] Search `freight` — the contact appears with the matching fact/note
      snippet quoted under the name.
- [ ] If an "Indexing N items in the background" line shows, existing data
      is being embedded automatically (first run downloads a model,
      one-time, local — skipped entirely if `DHAGA_EMBEDDINGS=off`, which is
      the recommended Vercel setting from §1a). Refresh after a minute and
      the line disappears.
- [ ] Semantic test (only meaningful with local embeddings on): search
      `logistics shipping` (words that appear in NO note verbatim) — the
      freight-forwarder contact still surfaces, with a "related note/fact:"
      snippet.
- [ ] Search gibberish — honest "No matches" empty state.
- [ ] With a key: **Ask AI** composes an answer naming the right person and
      citing their facts/notes. It only runs when clicked. Try "who did I
      meet at Web Summit in fintech?" and confirm the answer respects the
      event scope (query-understanding step, `apps/web/src/lib/ai/
      search.ts`).

### 7i. Warm paths (Graph page)

- [ ] On **Graph**, pick a company in "Warm path to" → **Find path** —
      chains render as You → person → … → target.
- [ ] Pick a target with no connection — honest "No thread reaches…"
      message.

### 7j. Job-change & news signal detection (opt-in, needs `FIRECRAWL_API_KEY` + `CRON_SECRET`)

- [ ] On a contact, toggle **"Watch for job changes & news"**.
- [ ] Hit `/api/jobs/detect-signals` yourself with the cron header:
      `curl -H "Authorization: Bearer $CRON_SECRET" <url>/api/jobs/
      detect-signals` — without `CRON_SECRET` set, this always 401s
      (`hasLLM()` also gated inside — `apps/web/src/lib/jobs/detect-
      signals.ts:33` — no key means `skipped: "no_llm"`, not a crash).
- [ ] A detected signal shows on Home; **Add as note** files it as a
      regular note (facts/receipts as usual). Re-running the sweep doesn't
      re-surface the same unresolved signal (`hasOpenSignal` guard). Note: double-clicking "Add as note" has no idempotency
      guard yet and could create duplicate notes; worth being aware of if
      you click it twice.

### 7k. Follow-up draft (needs the API key)

- [ ] On the contact, **Draft follow-up** — the draft must reference at
      least one real note-derived fact (e.g. the route-optimisation AI
      evaluation).
- [ ] Edit the text, **Copy**, paste somewhere — matches your edit.
- [ ] **Redraft** replaces your edits with a fresh draft.

### 7l. Enrichment (needs `ANTHROPIC_API_KEY`, ideally `FIRECRAWL_API_KEY` too)

- [ ] On a contact with a real public identity, **Enrich from public web** —
      a "web enrichment" note appears with cited source URLs, and facts
      extracted from it carry the note as their receipt.
- [ ] Delete the enrichment note — its derived facts disappear with it.

### 7m. Export (no lock-in)

- [ ] On People, the `csv` / `vcard` / `json` links each download a file.
- [ ] CSV opens in a spreadsheet with correct columns; vCard imports into a
      contacts app; JSON contains contacts, companies, events, notes,
      facts, edges, follow_ups.
- [ ] **Address-book seed scope** (there is no UI for it — edit the URL).
      `/api/export/vcard?scope=authored` drops contacts whose `source` is
      `mentioned` or `import` and any with no name, while the plain
      `/api/export/vcard` still contains every one of them. Check both files:
      the portability download must not have narrowed.
- [ ] Adding `&provider=device` (or `google` / `microsoft`) also drops anyone
      already linked on that provider — **including a tombstoned link**. Delete
      a synced contact on the phone, sync, then re-download: they must not be
      in the seed file, or a bulk import would resurrect them.
- [ ] Bad parameters are rejected, never ignored: `?scope=nope`,
      `?provider=nope`, `?provider=device` without `scope=authored`, and
      either parameter on `/api/export/json` → **400** with a message.
- [ ] An unlabeled email/phone exports as a bare `EMAIL:` / `TEL:` line with
      **no `TYPE`**, and a contact with a nickname and dates exports
      `NICKNAME`, `BDAY` and `itemN.X-ABDATE` / `itemN.X-ABLabel`. This is
      round-trip correctness, not tidiness: a field the seed drops comes back
      from the address book empty and the *second* sync reads it as a deletion.

### 7n. Forget this person (privacy cascade)

- [ ] On a contact, **Forget this person** → browser confirm → gone,
      redirected to People.
- [ ] Their events no longer list them; search finds nothing; a fresh
      JSON export contains no trace (contact, notes, facts, edges,
      follow-ups, embeddings and now notifications all gone —
      `apps/web/src/lib/repo/contacts/mutations.ts`'s `forgetContact`).
- [ ] **Known gap, unfixed at the time of writing:** `cascadeForget` never
      deletes `extraction_jobs`, whose `contact_id` is a `NOT NULL` `RESTRICT`
      foreign key — so forgetting a contact that still has a job row should abort
      with FK `23503` rather than cascading. Test a contact that has had a note
      extracted, and treat a failure here as this known bug, not a new one.

### 7o. LinkedIn/Google CSV import

- [ ] `/app/import` → upload a LinkedIn "Connections.csv" export → contacts
      appear with the event/company mapping expected; re-importing the
      same file doesn't create duplicates (whitespace/accent-insensitive
      dedup — see recent commits `de2d9d1`, `0690adb`).
- [ ] Same for a Google Contacts CSV export — including a location field if
      present (`Address N - Formatted` column).

### 7p. Email digest & waitlist (needs `RESEND_API_KEY` + `RESEND_FROM_EMAIL`)

- [ ] Join the waitlist / request access on the landing page with a real
      address — a branded confirmation email arrives.
- [ ] On an event page with people in it, **Email me the digest** — the
      digest (people + facts + follow-ups) arrives at `DHAGA_OWNER_EMAIL`.
- [ ] Unset `DHAGA_OWNER_EMAIL` and retry — clear "Set DHAGA_OWNER_EMAIL…"
      error, no crash (`apps/web/src/lib/actions/events.ts:53`).
- [ ] **Settings** → Suggestions tab → enable **Morning follow-up reminders**
      → hit `/api/jobs/daily` (same `CRON_SECRET` header as §7j) with open
      follow-ups or due reach-outs pending — an email lands at
      `DHAGA_OWNER_EMAIL` naming the pending count. Confirm the dummy/
      load-test account (`loadtest@dhaga.internal`) never receives it even if
      it's the configured owner — `isDummyAccount()` skips it
      (`apps/web/src/lib/jobs/morning-reminder.ts`). Gated on `RESEND_*`
      being set; `EMAIL_JOBS_HOURLY=true` (old name `MORNING_REMINDER_HOURLY`,
      honoured for one release) additionally restricts the send to the
      recipient's local ~08:00 run, and only makes sense if you drive the
      endpoint hourly. Full coverage of this job, the two digests and the
      per-tenant fix is in §7aa.

### 7q. Telegram bot & outbound webhooks (optional envs)

- [ ] With `TELEGRAM_*` set and the webhook registered (see
      `.env.example`): message the bot a signature → "Saved {name}"; send
      `?who did I meet in fintech` → an answer. Messages from other chats
      are silently ignored (chat-id allowlist check,
      `apps/web/src/app/api/telegram/route.ts`).
- [ ] With `DHAGA_WEBHOOK_URL` set: creating a contact POSTs
      `contact.created` to your URL; extracted follow-ups POST
      `followup.created`.

### 7r. Metering cap

- [ ] Set `DHAGA_AI_MONTHLY_CAP=1`, restart/redeploy, run one extraction,
      then try another AI action — friendly "cap reached" message, and
      capture falls back to the offline parser instead of failing.
- [ ] Remove the override and restart/redeploy.

### 7s. PWA install

- [ ] On your phone (local network IP or the deployed URL): browser menu →
      **Add to Home Screen** — Dhaga installs with the knot icon and opens
      standalone straight into `/app` (`apps/web/src/app/manifest.ts`).

### 7t. Browser extension

- [ ] `npm run build --workspace @dhaga/extension` (confirmed script exists,
      `apps/extension/package.json:9`, bundles into `apps/extension/dist`),
      then Chrome → `chrome://extensions` → Developer mode → **Load
      unpacked** → `apps/extension/dist`.
- [ ] With the web app running and you signed in: select a person's details
      on any page (name, title, email), click the Dhaga icon — the
      selection is pre-filled — **Save to my network** → success links to
      the contact.
- [ ] The contact's notes include the selection with the page URL (receipt).
- [ ] Signed out: saving shows "Sign in to Dhaga" with a login link.

### 7u. Contact network: pagination, context ranking, and identity resolution

This flow needs `ANTHROPIC_API_KEY` only for turning a note into facts and
relationships. Loading, filtering, pagination, ranking, promotion, and merge
are deterministic database operations and must not increase the AI usage
counter.

**Paginated connections and dynamic filters**

- [ ] Create one company and at least 30 contacts at that company. Open one
      contact, expand **Network**, then **Show connections**. Confirm only the
      first bounded page renders and **Load more connections** retrieves the
      next page without duplicates.
- [ ] Confirm **Same company** is presented as a filterable affiliation, not
      as an extracted direct relationship.
- [ ] Add two contacts to the same event and add a relationship note. Reopen
      Network and confirm the available filter menu includes the event and
      the extracted predicate, each with a count.
- [ ] Add multiple filter tokens, remove one token, clear all filters, and
      search by name. Confirm filtering happens before pagination and no stale
      results remain after applying a new filter.

**Open-ended shared context and mentioned people**

- [ ] On Aditi Sharma's profile, add the voice/text note `Attended an
      interview together with Aaryan Mehta`. Expand Connections and filter by
      **attended interview with**. Aaryan should appear even when he was not
      previously in People, labelled **Mentioned person**.
- [ ] Open Aaryan. Confirm he is absent from the main People list and the page
      offers **Add to People** and, when a plausible existing contact exists,
      **Merge with existing**.
- [ ] Click **Add to People**. Confirm Aaryan now appears in People and the
      relationship to Aditi remains.
- [ ] Repeat with a second mentioned person, create a corresponding full
      contact, then choose **Merge with existing**. Confirm the mentioned
      profile redirects to the full contact and the original relationship and
      source-note receipt remain attached to that full contact.
- [ ] Add a new person manually with the exact name of a single hidden mention.
      Confirm the mention is promoted instead of creating a duplicate.

**Ambiguous global voice/paste capture**

- [ ] Create three contacts named `Aditi Sharma`, `Aditi Singh`, and `Aditi
      Mehta`, with different companies or titles.
- [ ] In global Quick add, dictate or paste `Aditi has a son named Aaryan`.
      Confirm Dhaga asks **Which person did you mean?** before relationship
      extraction and shows title/company evidence for all three Aditis.
- [ ] Select Aditi Sharma. Confirm the note is attached only to her and the
      resulting `parent of` connection appears only on her profile.
- [ ] Repeat and select **None of these — create someone new**. Confirm the
      normal contact-review flow opens rather than updating an arbitrary
      Aditi.
- [ ] Paste a full unique name such as `Aditi Sharma has a son named Aaryan`.
      Confirm the exact full-name match bypasses the ambiguity screen.

**Context-aware relevant people**

- [ ] Create two CEOs: one tagged `fintech` and one with no shared sector,
      tag, geography, event, or warm path. Open Network → **Find relevant
      people**, select **Founder**, enter `fintech`, and click **Rank locally**.
- [ ] Confirm the fintech CEO appears with a concrete explanation and action;
      the unrelated CEO must not appear merely because their title is CEO.
- [ ] Try Founder, Sales, Investor, and Any goal with sector, stage, and
      geography context. Confirm every result states why it matched and the
      browsing/ranking actions do not increment AI usage.

Targeted automated verification:

```bash
npm exec --workspace apps/web -- tsc --noEmit
npm exec --workspace packages/core -- tsc --noEmit
npm test --workspace apps/web -- --run \
  src/lib/__tests__/network-retrieval.test.ts \
  src/lib/__tests__/graph-receipts.test.ts \
  src/lib/__tests__/contacts-mutations.test.ts
```

If Vitest fails before collecting tests with a missing schema module, check
`git status` first. In a shared worktree, another session may be moving or
deleting that schema file; restore or finish that parallel change before
interpreting the failure as a network-feature regression.

### 7v. Photo notes (needs `ANTHROPIC_API_KEY`)

Photo is the third way to capture a note, alongside typing and voice — for the
things a card scan is wrong for: a whiteboard, a conference poster, a
handwritten page, a receipt.

- [ ] On a contact, tap **Photo note** in the same composer as **Voice note**
      (on a phone this opens the camera). The tray appears with crop / reorder /
      remove, and the textarea stops being required — the photo carries the text.
- [ ] **Add note** → the saved note is labelled *photo*, and its body is the
      text read out of the image, so searching for a phrase written on the
      whiteboard finds it. Facts extract from it exactly as from a typed note,
      with the note as their receipt.
- [ ] Type a line as well → the note keeps both: your line and the
      transcription, not one replacing the other.
- [ ] The photos appear on the person's page as receipts, under the same
      **Store captured photos** setting (§7d) as scanned cards, and are deleted
      with the note.
- [ ] **A photo with nothing legible and no typed line is refused**, not saved
      as a blank note. With the AI cap exhausted, a typed line still saves as a
      plain note rather than the whole thing failing.
- [ ] Automated: `npx playwright test e2e/photo-note.spec.ts` (needs a real key
      — it makes a live vision call).

### 7w. Inbound messaging: every kind of forward (WhatsApp / Telegram)

The point of this section is that **nothing you send is ever silently dropped**.
Each case gets a contact, a note, or a reply saying why not. Covered by
`apps/web/src/lib/__tests__/messaging-cases/`.

- [ ] **Text** → routed like a web quick-add: a confident single match attaches
      the note to that person (no duplicate); no match creates them; ambiguity
      asks (below).
- [ ] **Forwarded contact card** (vCard) → the contact is built from the
      structured payload, with no AI re-parse. An unreadable card raises a
      notice rather than vanishing.
- [ ] **Photo of a business card** → scanned into a contact. **Any other photo**
      → transcribed into a note on the person; a caption is kept as well.
      Test this on **Telegram specifically**: Telegram sends no mime type, and
      every Telegram photo used to be dropped for that reason alone.
- [ ] **Voice note** → replies *"Voice notes aren't supported yet — coming
      soon! For now please type it, send a photo, or forward a contact."* It is
      refused at the door, not stored as a stub. This message is gated on a
      transcription provider being registered, so it disappears by itself the
      day one is plugged in — don't hard-code around it.
- [ ] **Ambiguous note** ("met Aditi today" with three Aditis) → a numbered
      question in the chat. Answer by number, by name, or `new`. Reply with
      something else instead and the question is *released*: the pending note is
      saved under a new person and your new message is handled normally — it is
      never lost.
- [ ] **Video / document / sticker / unknown attachment** → an immediate reply
      naming what it was; nothing stored.
- [ ] **Empty message** → an immediate reply.
- [ ] **A media download that fails** → that one item fails and the rest of the
      batch still processes. It used to abort the whole batch.
- [ ] The batch summary reflects what actually happened — a batch that only
      asked a question says it is waiting on your answer, not that it couldn't
      find a contact.

### 7x. Birthdays & anniversaries → reminders (no API key needed)

Important dates have been storable on a contact for a while; what is new is that
they now *do* something. Reminders are **derived** from the dates on your
contacts — there is no reminders table — so editing a date or forgetting a
person needs no cleanup, and that is the property to test.

- [ ] On a contact → **More details** → **Important dates** → **Add date**. The
      row starts as `Birthday` and the value is a real **calendar picker**: month
      *and* year are dropdowns, so a 1974 birth year takes two clicks rather than
      scrolling back six hundred months. Save.
- [ ] Reopen the contact — the picker opens on **that date's month**, not on
      today.
- [ ] A date imported from Google or a `.vcf` may be stored verbatim
      (`December 9`) or without a year (`12-09`). Open the form and confirm the
      picker trigger shows that text as a **placeholder**, and that saving other
      fields leaves the string **byte-identical**. Dhaga must not silently
      reinterpret a date the user never typed.
- [ ] Set a date a few days out, then check all three surfaces agree:
      **`/app/calendar`** shows an all-day amber entry reading `Name — Birthday`,
      **`/app/follow-ups`** lists it under **Upcoming dates**, and the nav
      **bell** carries it in the feed.
- [ ] On the calendar, **try to drag it** — it snaps back and nothing is saved,
      and clicking it opens the contact rather than a Done/Reschedule dialog. A
      birthday is not a task; the caption under the grid says so ("Birthdays and
      anniversaries come from your contacts — open the contact to change one").
- [ ] Set the date **further out** than the lead window (Settings → Suggestions →
      **Birthdays & anniversaries** → *Days ahead*, default 7) — it disappears
      from all three. Widen the lead time and it comes back. The **Upcoming
      dates** section hides entirely when nothing is in the window rather than
      showing an empty heading.
- [ ] Save `02-29` on a contact and confirm that in a non-leap year the
      occurrence lands on **28 February**, never 1 March.
- [ ] **Delete the date, or forget the person** → every surface above clears with
      no leftover reminder. That is the point of deriving them.
- [ ] Automated: `npm test --workspace packages/core -- --run
      src/dates/important-dates.test.ts` for the recurrence maths, plus
      `npm test --workspace apps/web -- --run
      src/app/app/follow-ups/__tests__/upcoming-date-copy.test.ts
      src/components/app/calendar/__tests__/event-map.test.ts`.

### 7y. The notification bell, and knowing a background job finished

The bell used to count follow-ups only. It is now a feed of three kinds —
follow-up reminders and upcoming dates (both derived, nothing stored) and
**persisted notifications** (a real table), which is the first thing that tells
you a background job finished after you navigated away.

- [ ] Open the bell: the header reads **Notifications**, unread persisted items
      sort above the derived reminders, and read ones stay below as history.
      Empty state: *"You're all caught up ✨"*.
- [ ] A follow-up row still has a **Done** pill. An important-date row has **no**
      action — only a link to the contact.
- [ ] The **badge** counts overdue + due-today follow-ups, unread notifications,
      and important dates **only when they land today**. A birthday six days out
      belongs in the panel but must not inflate the badge — the badge means "act
      now".
- [ ] Add a note on a contact then **navigate away immediately** (Home is fine).
      When extraction finishes, the bell gains an unread item —
      *"Extracted 4 facts and 1 follow-up from your note about …"*. Click it: it
      marks read and opens the contact. Also exercise the **X** (dismiss) and
      **Mark all read**.
- [ ] Exhaust the AI budget (§7r) and add a note → a *blocked* notification
      saying extraction is a paid feature, **and the note is still saved**. Force
      a failure → a failed notification whose body carries the reason, with
      **Retry** on the contact page.
- [ ] **Forget a contact that has notifications** → its rows go with it. Titles
      embed contact names, so both foreign keys are `ON DELETE CASCADE`; a
      notification outliving its contact would be a privacy bug, not clutter.
      (Separately and still unfixed: forgetting a contact that has an
      `extraction_jobs` row aborts on a foreign key — see §7n.)
- [ ] Automated: `npm test --workspace apps/web -- --run
      src/lib/__tests__/notifications.test.ts
      src/lib/__tests__/notification-feed/ordering.test.ts
      src/lib/__tests__/notification-feed/actions.test.ts`.

### 7z. Background-job progress that actually settles

Each of these was a real failure, so test them as regressions rather than as
features.

- [ ] Add a note → the copy says the work **keeps running if you leave the page**
      — then leave, come back, and confirm the facts are there. The claim has to
      be true, not merely reassuring.
- [ ] Stay on the page → the pill becomes a confirmation with **real counts**
      (*"Extraction finished — 4 facts and 1 follow-up added."*), a toast fires,
      and the pill **clears itself** after ~12s. It must not need a reload; a
      sticky "extracting facts…" notice that only a refresh cleared was the bug.
- [ ] Trigger **Enrich from public web** → same shape ("Searching the public web
      in the background. This keeps running if you leave the page…"), and it
      settles into a finished or failed state — never a spinner that runs
      forever.
- [ ] Start a job then **navigate away mid-stream**. The job must be recorded
      **done**, not failed: writing to a closed stream used to mark an
      already-successful job FAILED.
- [ ] Open the same contact in **two tabs** and start one job. Both settle; only
      the tab that ran the worker toasts, and the other reconciles by polling.
- [ ] Automated: `npm test --workspace apps/web -- --run
      src/components/app/contact/ExtractionStatus/useExtractionStream/settle.test.ts
      src/components/app/contact/ExtractionStatus/useExtractionStream/live-state.test.ts`.

### 7aa. Time zone + the daily email jobs (needs `RESEND_*` + `CRON_SECRET`)

Three of these emails **could never send for a hosted user** before 2026-07-30:
they read their own opt-in setting on an unscoped connection, so under EE
row-level security the read matched zero rows and every toggle looked `off`. If
you run hosted mode, treat this section as the regression test for that.

- [ ] Settings → Suggestions → **Time zone**. It defaults to `UTC` (existing
      users see no change until they choose), the picker searches cities, and
      **Use detected zone (…)** appears only when your browser disagrees — it
      fills the field and never auto-saves. Save it.
- [ ] Enable **Morning follow-up reminders**, the **Confirmations digest** and
      **Birthday and anniversary reminders**, then hit `/api/jobs/daily` with the
      `CRON_SECRET` header (as §7p) — in **hosted mode, with a second non-owner
      account**, each opted-in account gets its own email. Only the owner
      receiving mail means the per-tenant fan-out has regressed.
- [ ] Hit the same endpoint **twice in a row** → the second run sends nothing.
      Each job records the recipient's **local** day, so a re-triggered cron is a
      no-op even for someone at UTC+14.
- [ ] The **due-follow-up** email now includes items due within the next 3 days,
      each tagged honestly (`Overdue` / `Due today` / `Due tomorrow` /
      `Due in N days`) — previously an item due in three days was not emailed
      until it was already late. The **bell** is deliberately unchanged: still
      overdue + due-today only.
- [ ] The **birthday reminder** arrives at most **twice per occurrence** — once
      when it enters the lead window, once on the day itself. Run the cron on
      several consecutive days and confirm there is no third email.
- [ ] With the birthday toggle **off** (its default), no birthday email is ever
      sent however many dates are saved. Imported address books arrive full of
      dates the user never reviewed, which is why opt-in is the design.
- [ ] `EMAIL_JOBS_HOURLY=true` applies **only** if you drive the endpoint hourly;
      then the morning reminder, reach-out digest and confirmations digest send
      only on the run matching the recipient's local ~08:00. Unset — the Vercel
      Hobby default of one cron a day — every job still sends on that single run:
      the gate must never be able to discard the only invocation of the day.
      `MORNING_REMINDER_HOURLY` is honoured for one release as the old name.
- [ ] Automated: `npm test --workspace apps/web -- --run
      src/lib/jobs/morning-reminder.test.ts src/lib/jobs/daily-digest.test.ts
      src/lib/jobs/confirmations-digest.test.ts
      src/lib/jobs/follow-up-reminders.test.ts
      src/lib/jobs/important-date-reminders/index.test.ts
      src/lib/__tests__/timezone-zone.test.ts
      src/lib/__tests__/timezone-settings.test.ts`. The three job suites model
      RLS by returning rows **only** inside a tenant scope and counting unscoped
      reads, so the old implementation fails them.

**None of §7x–§7aa has had a browser click-through yet.** All four were built and
unit-tested while the working tree was under concurrent edit, so treat every box
in them as genuinely unrun rather than "probably fine".

---

## 8. What works with zero API keys vs. what needs one

Confirmed via `hasLLM()` (`packages/core/src/llm/index.ts:46-48`, `Boolean(
process.env.ANTHROPIC_API_KEY)`) and its callers — every AI-shaped feature
checks this before calling out, and degrades to an honest message or an
offline fallback rather than failing:

| Works with **zero** API keys | Needs `ANTHROPIC_API_KEY` | Needs something else too |
|---|---|---|
| Sign up / login / sessions (better-auth) | Card photo scan (OCR) | — |
| Manual People CRUD | Quick-add AI extraction (falls back to a heuristic offline parser without it) | — |
| Quick add via the **offline heuristic parser** (no AI badge) | Notes → fact/follow-up extraction | — |
| Keyword search | Semantic search snippets ("related note/fact:") | Local embeddings must be on (`DHAGA_EMBEDDINGS` not `off`) |
| Warm-path graph traversal | Ask AI (search reasoning) | — |
| CSV/vCard/JSON export | Follow-up drafts | — |
| Forget this person (deletion cascade) | Brief me (pre-meeting dossier) | — |
| LinkedIn/Google CSV import | Web enrichment | Best with `FIRECRAWL_API_KEY` too |
| Browser extension capture | — | — |
| Telegram bot capture/query | Telegram's `?who...` query answers | `TELEGRAM_*` |
| Admin panel / access requests / billing | — | `DHAGA_HOSTED_MODE`, real Postgres (`DATABASE_URL`), `DHAGA_ADMIN_EMAILS`; billing also needs `STRIPE_SECRET_KEY` |
| Job-change/news signal detection | Signal detection itself needs the key | `FIRECRAWL_API_KEY`, `CRON_SECRET` |
| Event digest emails | — | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `DHAGA_OWNER_EMAIL` |

---

## 9. Static verification (CI)

```bash
npm run lint --prefix apps/web           # ESLint
npm run typecheck --workspace @dhaga/core
npm run build                            # production build must pass
npm run test --prefix apps/web           # vitest
```

---

## 10. Load-testing `/app/graph` and `/app/people` at scale

Neither page paginates today: `listContacts()` (`apps/web/src/lib/repo/
contacts/queries/recent.ts`) selects the entire `contacts` table with no
`LIMIT`, and `GraphBrowser` (`apps/web/src/components/app/graph/
GraphBrowser.tsx:16-43`) renders every node/edge through `@xyflow/react`
(DOM/SVG, no virtualization) after recomputing a full ring layout on every
load. There is no coded cap on contact count anywhere (checked
`apps/web/src/utils/constants/plans.ts` — the only metering is the monthly
AI-action cap, not row count), so the practical ceiling is UI render
performance, not storage.

**`apps/web/scripts/seed-dummy-graph.mjs`** seeds (or removes) exactly one
synthetic, RLS-scoped account to test this without touching real data:

```bash
cd apps/web
node --env-file=.env.vercel scripts/seed-dummy-graph.mjs create --contacts=1000
node --env-file=.env.vercel scripts/seed-dummy-graph.mjs recreate --contacts=200   # or any other size
node --env-file=.env.vercel scripts/seed-dummy-graph.mjs delete                    # tear down when done
# equivalently: npm run seed:dummy-graph -- <create|delete|recreate> [--contacts=N]
```

Swap `--env-file=.env.vercel` for whichever env file points `DATABASE_URL`
at the Postgres you want to load — this needs real Postgres (hosted mode's
RLS), the same constraint as §3; it does nothing useful against embedded
PGlite.

What it does: creates one `user` row + a `credential` account (via
`better-auth/crypto`'s `hashPassword`, so the account logs in through the
normal `/login` form) at a fixed id/email
(`loadtest@dhaga.internal` / `LoadTest-Dummy-2026!`, printed on `create`),
then — with `app.current_user_id` set to that account's id for the whole
transaction — inserts N contacts, N/15 companies, and N/3 relationship
edges, all tagged `user_id = dummy-loadtest-user`. Because
`packages/ee`'s `tenant_isolation` RLS policy (`packages/ee/src/db/
rls-ddl.ts`) scopes every read/write/delete by that session variable,
`delete`/`recreate` can only ever see and remove this one account's rows —
it cannot read or touch any other tenant's data, however large this
account's own row count gets.

- [ ] **Confirmed by a live run (2026-07-12):** ran `create --contacts=1000`
      against the deployed Vercel project's Supabase — created 67
      companies, 1000 contacts, 333 explicit edges (plus the "works at"
      edges `fetchGraphView` derives from `company_id`,
      `apps/web/src/lib/repo/graph-data.ts:58-69` — so `/app/graph` renders
      roughly 2,000+ nodes/edges total for this account). Log in as that
      account and open `/app/graph` and `/app/people` to feel where render
      time and pan/zoom actually degrade — re-run `recreate` at other sizes
      to bracket it. **Not yet done:** nobody has recorded the actual
      degradation threshold from a live run — this section only confirms
      the seeding step works, not a measured performance number.
- [ ] Run `delete` when finished — leaving the dummy account in a shared
      Supabase project is harmless (it's fully isolated by RLS) but there's
      no reason to keep it around once you have your numbers.
