# Self-hosting Dhaga without Dhaga Cloud

This repo ships two things in one codebase:

1. **The AGPL core** — the whole CRM (capture, notes, graph, search, drafts,
   export, Telegram, the browser extension API) plus real user accounts
   (better-auth). This is what you get when you self-host. Nothing here is
   crippled or trial-limited.
2. **`packages/ee`** — Dhaga Cloud only: multi-tenant row-level security,
   the "request access" gate, the admin panel, and Stripe billing. Licensed
   separately (source-available, noncompete — see
   [`packages/ee/LICENSE`](packages/ee/LICENSE)), not AGPL, not required to
   run the core.

If you're self-hosting for yourself or a small trusted group, you almost
certainly want **just the core**. This document is about exactly that: what
you get, what you don't, and how the switches work.

## TL;DR

- Don't set `DHAGA_HOSTED_MODE`. That's it — every EE feature goes inert.
- You do **not** need to delete `packages/ee` from your clone. It's harmless
  dead weight until that flag is set to `"true"`.
- Registration is open (no invite/approval step) whenever hosted mode is off,
  but the core is **single-user**: the first account is created normally and
  every subsequent signup is rejected (see "Single-user by design" below).
- There is no admin panel, no "Admin" nav item, and no billing UI in this mode
  — not hidden, not disabled, just not rendered at all.

## Two levels of "without EE"

### Level 1 (recommended): leave `DHAGA_HOSTED_MODE` unset

This is the default state of `apps/web/.env.example` — the var isn't even
listed there, only in [`packages/ee/.env.example`](packages/ee/.env.example).
With it unset:

- Every one of the four extension points in
  [`apps/web/src/lib/hosted/gate.ts`](apps/web/src/lib/hosted/gate.ts)
  (`TenantGate`, `SignupGate`, `BillingGate`, `AdminGate`) short-circuits to
  its permissive default *before* it ever tries to load `@dhaga/ee` — so it
  doesn't matter whether the package is physically present.
- The two EE-only routes (`/api/access-requests`, `/api/stripe/webhook`)
  additionally check the flag themselves and return `404` if it's off, so an
  unrelated visitor can't accidentally trigger EE's schema setup against your
  database even if `packages/ee` happens to be installed and `DATABASE_URL`
  happens to point at real Postgres.
- `/app/admin` 404s for everyone (the `isAdmin` check always resolves
  `false`), so there's no dead link to a panel that doesn't work.

Nothing to delete, nothing to configure. This is the state you're in if you
just `git clone` and run the app.

### Level 2 (advanced): physically remove `packages/ee`

Do this only if you want a tree that's *provably* 100% AGPL — for example,
forking the project and redistributing it under AGPL terms only, without even
source-available proprietary code present. Delete:

```
packages/ee/
apps/web/src/app/app/admin/
apps/web/src/app/api/access-requests/
apps/web/src/app/api/stripe/
apps/web/src/lib/actions/admin/
apps/web/src/components/app/admin/
apps/web/src/components/app/table/AdminTables.tsx
```

Also remove the `"@dhaga/ee": "*"` line from `apps/web/package.json`
dependencies (and the `"@dhaga/ee"` entry in `transpilePackages` in
`apps/web/next.config.ts`), then re-run `npm install`.

Everything else builds and runs unchanged — these are exactly the files that
statically import `@dhaga/ee`; nothing else in the core references it. If you
delete `packages/ee` but forget one of the route folders above, `next build`
will fail with a clear `Module not found: Can't resolve '@dhaga/ee/...'`
naming the exact file to remove.

Note the asymmetry with Level 1: `lib/hosted/gate.ts` itself does **not**
need to be deleted or edited — its dynamic `import("@dhaga/ee")` is wrapped
in a try/catch specifically so this file survives the package's removal.

## Single-user by design (core only)

With hosted mode off, the core is **single-user** — it enforces exactly one
account, and this is a hard rule, not a suggestion. The reason is structural:
per-user data isolation (row-level security scoping every query to its owner)
lives entirely in `packages/ee`. The AGPL core's `getDb()` hands every request
one unscoped connection over one shared graph
([`apps/web/src/lib/db/request-scope.ts`](../apps/web/src/lib/db/request-scope.ts)).
That is completely safe for one person, but a second account on the same core
instance would land in — and read and edit — the first user's contacts, notes,
and facts. There is no per-user wall to hide behind.

So the signup path refuses to create a second account when hosted mode is off:
the first signup succeeds normally, and any later one is rejected with a
`403` explaining why (see `beforeUserCreate` in
[`apps/web/src/lib/auth/config/index.ts`](../apps/web/src/lib/auth/config/index.ts)).

If you need more than one user with real isolation between them, that's exactly
what hosted mode (`packages/ee`) provides — enable it (`DHAGA_HOSTED_MODE=true`
plus real Postgres; see [`DEPLOYING.md`](DEPLOYING.md)) and multi-tenant RLS
takes over. Self-hosting the core for a genuinely shared, trusted household
where everyone is fine seeing everyone's data is not supported by relaxing this
guard — the guard is what keeps "single-user" honest.

## Disabling just billing (keep admin + early access)

If you're running the hosted product but not ready to charge (a free beta,
for instance), you don't need to touch `DHAGA_HOSTED_MODE`. Simply don't set
`STRIPE_SECRET_KEY`. The settings page's "Plan & billing" section checks for
that key itself and renders nothing — not a broken "Upgrade" button, no
section at all — while the admin panel and early-access gate keep working
normally.

## Referral rewards (hosted/EE only)

The two-sided referral program (a free month of Pro for both advocate and
referee) lives entirely in `packages/ee` and only functions in hosted mode — it
extends a user's `subscriptions` row, which the core has no concept of, and a
self-host is single-user anyway (there's nobody to refer). On a self-host the
referral surfaces are simply absent: `/api/referral` returns
`{ referral: null }` and `/app/referral` shows an "unavailable" note — the same
permissive-fallback pattern as billing (`getReferralGate()` in
`apps/web/src/lib/hosted/gate`).

In hosted mode the reward is delivered Stripe-safely. An advocate who already
has a live Stripe subscription is given a Stripe coupon — set
`STRIPE_REFERRAL_COUPON_ID` to a `duration: once`, 100%-off coupon you create in
the Stripe dashboard — while free/comp users get an additive comp Pro month
(their `current_period_end` is extended, never downgrading a lifetime grant). If
`STRIPE_REFERRAL_COUPON_ID` is unset when a paying advocate qualifies, the grant
fails loud and the referral stays `pending` for retry rather than silently
half-rewarding.

## Creating the first admin user

There's a deliberate chicken-and-egg problem here: the admin panel can only
promote a user to admin if you're *already* an admin, and (in hosted mode)
signup itself is gated behind an approved access request, which normally
only an admin can approve. `DHAGA_ADMIN_EMAILS` breaks that circle:

1. Set `DHAGA_HOSTED_MODE=true` and `DHAGA_ADMIN_EMAILS=you@yourdomain.com`
   (comma-separated if more than one) in `packages/ee`'s environment.
2. Go to `/signup` and create an account with that exact email address.
   `DHAGA_ADMIN_EMAILS` bypasses the access-request check for these specific
   emails — this is the one case where signup works without a prior
   approved request.
3. You're now an admin automatically — `isAdmin` checks `DHAGA_ADMIN_EMAILS`
   in addition to the database flag, so nothing needs to be flipped
   manually. `/app/admin` is live for that account immediately.
4. From `/app/admin/users`, you can now promote other accounts by setting
   their `isAdmin` flag through the UI — they don't need to be in
   `DHAGA_ADMIN_EMAILS` themselves once that's done.

`DHAGA_ADMIN_EMAILS` is safe to leave set permanently as a break-glass path
(e.g. if you ever lock yourself out of the only admin account) — it's
env-config, not a stored credential, and only your deployment operator
controls it.

## Managing a user's subscription and AI allowance (hosted/EE admin)

From a user's detail page (`/app/admin/users/[id]`) an admin can, without
Stripe, comp that user's access:

- **Plan** — set `free`, `pro`, or `lifetime`. `free` removes the subscription
  row (the account falls back to the instance default allowance); `pro` and
  `lifetime` move it onto that plan's monthly allowance — 300 credits a month
  for Pro, no ceiling at all for Lifetime.
- **Expiry** — an optional date on a paid plan. Once it passes the plan stops
  being in play and the account drops back to the instance default allowance
  (leave it blank for no expiry).
- **AI credits** — a per-user monthly cloud-AI credit allowance, stored as the
  `ai_monthly_cap_override` setting. It sits at the top of the precedence ladder
  for that one user, beating a running promotion, the plan allowance and the
  instance default alike; blank or `0` clears it. Credits are
  charged per user-visible action, not per model call — a card scan costs 1
  credit whether it takes one round-trip or three, and deep research costs 20
  (`packages/core/src/metering/credits.ts`, BRD §8.3).

These controls live only in the EE admin panel. On a core-only self-host billing
isn't running, so no plan is ever in play and every user resolves through the
instance-wide default — which is what `DHAGA_AI_MONTHLY_CAP` seeds (see the env
table below).

### Instance-wide AI credit controls (`/app/admin/ai-credits`, hosted/EE)

Beside that per-user override, `/app/admin/ai-credits` carries three levers that
apply to the whole instance:

- **Plan-cap enforcement** — a master switch that is **on by default**
  (`AI_PLAN_CAP_ENFORCEMENT_DEFAULT = true`). In the shipped state every user is
  held to the monthly allowance for their plan: Free and Pro have a number,
  Lifetime / Annual has no cap. That is what the pricing page states — it sells
  Pro and Annual as **300 credits a month** and says what runs out when they do
  — so leave it on unless you have a reason not to. Turning it **off** is an
  escape hatch (a migration, an incident), not a resting state: the allowances
  below are then stored but ignored, every plan resolves through its raw billing
  entitlement (`hasUnlimitedAi`) instead, and users with no plan fall back to the
  instance default. Promotions and grants keep working either way.
- **Monthly allowance per plan** — runtime-editable overrides of the shipped
  numbers (`PLAN_AI_CREDITS_PER_MONTH`), per plan, each of which can also be set
  to "no cap". **Free** is editable here exactly like Pro and Power, and it does
  double duty: whatever it is set to is also the instance-wide default (rung 4
  below). The card names the live number and where it came from — e.g.
  "Effective default: 10 credits / month — from the shipped default in code",
  or from "the Free allowance set here", or from "the `DHAGA_AI_MONTHLY_CAP`
  seed".
- **Promotional month** — lifts *every* user to one allowance for a window
  ("everyone gets 1,000 credits this month"). It works whether or not
  enforcement is on, and it ends at the **start** of its end date, evaluated on
  every read — so it expires by itself with no cron job and no admin cleanup.

The same page holds the **grant** ledger: additive make-good credits for one
user (or, with the user id left blank, everyone), with a required reason and an
expiry that defaults to the end of the current month. A grant only moves the
ceiling — `ai_actions`, the only record of what cloud AI actually cost, is never
rewritten, and "End now" stops a grant counting without deleting its row.

Precedence, highest first
(`apps/web/src/lib/ai/metering/cap/index.ts`):

1. **Per-user admin override** (`ai_monthly_cap_override`) — wins outright,
   including over a running promotion.
2. **Active instance-wide promotion** — applies whether or not enforcement is on.
3. **Plan allowance** — when the master switch is on (it is, by default) *and* a
   **paid** plan is in play. The admin-edited value if one is set, else the
   constant in `apps/web/src/utils/constants/plans.ts`; `null` means no ceiling.
4. **The instance default** (`instanceDefaultCap()` in
   `apps/web/src/lib/ai/metering/cap/instance-default.ts`): the admin-set
   **Free** allowance, else `DHAGA_AI_MONTHLY_CAP`, else the shipped
   `FREE_TIER_AI_CREDITS_PER_MONTH` (10 credits a month).

Then, on top of whichever rung won, **every active grant for this user** is
added.

Rung 4 is the one that catches a free user, a user no plan governs (a self-host,
where billing isn't running), and everyone when the master switch is off. Free
users resolving *there* rather than through the plan ladder is deliberate: it
means `DHAGA_AI_MONTHLY_CAP` means the same thing on a self-host as it does on
an instance that has billing. Note what "seed" implies — the env var supplies
the instance default only while nothing has been set in the database. The moment
an admin sets a number (a per-user override, a promotion, a plan allowance, or
the Free allowance), that stored number wins and the env var stops mattering.
Nothing is copied into the database at boot; env is simply read last, so there
is one live number and the admin screen can say where it came from.

**What a core-only self-host gets.** The two tables this feature stores its
state in — `ai_budget_settings` and `ai_credit_grants`
([`apps/web/src/lib/db/ddl/ai-budget.ts`](../apps/web/src/lib/db/ddl/ai-budget.ts))
— belong to the AGPL core, so they are created on your database whether or not
`packages/ee` is present. Nothing else follows from that: there is no admin UI
to write to them (both simply stay empty), and no row-level security on them
either — `ai_credit_grants` gets its bespoke
`user_id IS NULL OR user_id = <tenant>` policy only from
`packages/ee/src/db/rls-ddl.ts`, and
`ai_budget_settings` deliberately gets none anywhere, being operator config
rather than user data. With both tables empty and no billing running, every user
resolves at rung 4 and one number governs the whole instance: whatever
`DHAGA_AI_MONTHLY_CAP` seeds, else the shipped 10 credits a month. **Nothing here
is required from `packages/ee` to self-host**, and the Level 2 removal list above
needs no additions — the new admin page and its server actions and components
live under `apps/web/src/app/app/admin/`, `apps/web/src/lib/actions/admin/` and
`apps/web/src/components/app/admin/`, which are already on it.

## Running with `docker compose up`

The repo root has a [`Dockerfile`](../Dockerfile) and [`compose.yml`](../compose.yml)
that run the web app plus a Postgres 16 + pgvector container. The app creates
its own schema (including the `vector` extension) on first connection — there
is no migration step.

1. Create a `.env` file next to `compose.yml`:

   ```
   BETTER_AUTH_SECRET=   # openssl rand -base64 32
   # Optional: ANTHROPIC_API_KEY, BETTER_AUTH_URL (defaults to
   # http://localhost:3000), POSTGRES_PASSWORD (defaults to "dhaga" —
   # change it if the DB port is ever exposed), RESEND_*, DHAGA_*
   ```

2. `docker compose up --build`
3. Open http://localhost:3000 and sign up. Contact data lives in the
   `dhaga-db` volume; `docker compose down` keeps it, `down -v` deletes it.

None of the `packages/ee` vars are wired into `compose.yml` — this is the
plain AGPL self-host path (Level 1 above).

**Contact import is fully core** — the `.vcf`/CSV file importer, the mobile
`POST /api/import` endpoint, and the OAuth contact connectors all live in the
AGPL core (no `@dhaga/ee`). The **Connect Google / Outlook** buttons are
env-gated: they appear only when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` or
`MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET` are set, so a self-host with none
of them simply shows file import — no missing-feature errors. See
`docs/CONTACT_IMPORT_SETUP.md` to configure the connectors. Provider OAuth tokens
are encrypted at rest (`encryptOAuthTokens`).

**Two-way phone sync is fully core too, and needs no configuration at all** — the
merge (`packages/core/src/sync`), the repo layer, and `POST /api/sync/contacts`
(+ `/ack`) import nothing from `@dhaga/ee`, so they're unaffected by Level 1 *and*
Level 2 and don't belong on the deletion list above. There's no env var and no
new API key: the mobile app authenticates with the same per-user key it already
uses, and on iOS the change is handed to the operating system, which relays it to
iCloud or Google itself — so **phone sync** never needs a Google or Microsoft
contacts-write scope.

**Server-side account sync (Google People / Outlook) is also core, and is opt-in.**
`packages/core/src/sync/{google,microsoft}-provider`, `lib/repo/contact-sync` and
`/api/contact-sync/*` import nothing from `@dhaga/ee`. Unlike phone sync it DOES
need credentials, and it reuses the calendar integration's:
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET`.
Two extra steps on that OAuth app: enable the **People API** (Google) or
**Contacts.ReadWrite** (Microsoft), and register
`/api/contact-sync/callback/{google,microsoft}` as redirect URIs. Set nothing and
the Settings card reports no configured providers while phone sync keeps working.
Google's contacts scope is **sensitive, not restricted** — standard verification,
no CASA assessment, no annual audit, no fee.

The EE-side touches are additive and inert without hosted mode: `packages/ee` adds
`contact_links` and `contact_connections` to its `TENANT_TABLES` so both get RLS
when multi-tenancy is on. `contact_connections` holds OAuth tokens, so on a
multi-tenant deployment that scoping is doing real work. See
`apps/web/content/docs/guide/syncing-your-phone.mdx` for the user-facing behaviour
(including the Android limitation).

### Custom database deployments

`compose.yml` is a working reference, not a requirement — `DATABASE_URL` can
point at **any Postgres 15+** (self-hosted, RDS, Neon, Supabase, …). What the
app needs from the database:

- **`pg_trgm`** — always; it's a contrib extension every Postgres ships, and
  the app's boot DDL runs `CREATE EXTENSION IF NOT EXISTS` itself.
- **`pgvector`** — needed by the default semantic search, *optional* if you
  set `DHAGA_VECTOR_STORE` to a registered external vector store (see
  [PROVIDERS.md](PROVIDERS.md)); the boot DDL skips the vector schema
  entirely in that case.
- **Any pooling mode — session or transaction** (hosted mode only) — tenant
  scoping is transaction-scoped: each unit of work runs inside one
  `BEGIN…COMMIT` whose first statement sets `app.current_user_id` transaction-
  local (`packages/ee/src/tenant/scoped-db.ts`; admin bypass likewise in
  `admin-db.ts`), and the connection is returned to the pool with no session
  reset (`pool.ts`). Because the whole scope lives in one transaction that sets
  its own setting first, it is never run unscoped and never leaks across
  backends — so **both** a session-mode pooler (Supabase port 5432) and a
  transaction-mode pooler (Supabase port 6543, PgBouncer, Supavisor, Neon's
  `-pooler` endpoint) are safe, as is a direct connection. There is no
  pooling-mode boot guard (the earlier session-mode-only guard and its
  `DHAGA_ALLOW_TRANSACTION_POOLER` override were removed); switching pooler is a
  `DATABASE_URL` change only. Co-locating compute and the DB in one region is
  still the recommended setup — a co-located DB makes the cold connection
  handshake ~ms and sidesteps the timeout tuning entirely; a cross-region
  `DATABASE_URL` instead needs a larger `connectionTimeoutMillis` (the default
  is 10s) to absorb that handshake. Both pool timeouts are env-overridable
  without a redeploy — `DB_POOL_CONNECTION_TIMEOUT_MS` and
  `DB_POOL_IDLE_TIMEOUT_MS`.
- **A role without `BYPASSRLS` or `SUPERUSER`** (hosted mode only) — either
  attribute makes the role ignore RLS (a superuser bypasses it unconditionally
  even while `rolbypassrls` reads false), and the boot guard rejects both. Run
  [`packages/ee/scripts/create-app-role.sql`](../packages/ee/scripts/create-app-role.sql)
  and connect as `dhaga_app`; see DEPLOYING.md's "The Postgres role
  DATABASE_URL connects as matters" for why the provider default role is
  dangerous. Plain single-user self-hosting (hosted mode off) needs none of
  this — any role that can create tables works.

### Nightly signal detection (job-change + news watchlist, opt-in)

The web-search sweep behind a contact's "Watch for job changes & news"
toggle (BRD §6.7) runs from `/api/jobs/detect-signals`, not a background
process — there is no job queue to run in a container. Point any scheduler
at it:

```
0 6 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain/api/jobs/detect-signals
```

Requires `CRON_SECRET` and `FIRECRAWL_API_KEY` (or another `SEARCH_PROVIDER`)
set — see `.env.example`. Without `CRON_SECRET` the route always returns
401, so it's safe to leave unconfigured if you don't want the feature.

### Daily email jobs (digests and reminders)

Every recurring email — the reach-out digest, the confirmations digest, the
morning follow-up reminder, the due-follow-up sweep, the birthday/anniversary
reminder and the LinkedIn-export nudges — runs from the one `/api/jobs/daily`
endpoint, on the single Vercel cron in `apps/web/vercel.json` (`"17 6 * * *"`,
unchanged). All of them are **opt-in per user** in Settings → Suggestions and
all degrade to a clean no-op without `RESEND_API_KEY` / `RESEND_FROM_EMAIL`
(and, on a single-user self-host, `DHAGA_OWNER_EMAIL`).

Each user's **time zone** (Settings → Suggestions → Time zone, default `UTC`)
decides which calendar day a job is reasoning about, so a birthday lands on the
recipient's day rather than the server's, and a re-triggered cron is a no-op for
someone already emailed on their local day. What the time zone does **not** yet
change is *when* the mail goes out: every send still happens on the one cron
run, at whatever UTC time it fires. Per-user local-morning delivery needs the
endpoint driven **hourly** with `EMAIL_JOBS_HOURLY=true` (see the env table
below), which is exactly what Vercel Hobby cannot do — see the Hobby cron
warning under "Idle auto-flush" below; it applies to this endpoint too. Off
Vercel, an hourly system crontab or container timer is enough.

## Messaging capture (WhatsApp / Telegram)

Forward a contact card, a note, or a photo to a WhatsApp or Telegram bot
and Dhaga turns it into people in your graph. Messages from one sender
accumulate in a **session** until you reply **DONE** (or the session goes idle);
then a positional batch processor creates and tags the contacts, keeps a receipt
per message, and replies with a summary.

**This is core / fully self-hostable (AGPL) — not an EE/cloud feature.** All of
it lives in `apps/web` (webhooks, jobs, repo, the Settings UI) and
`packages/core` (`src/messaging/` gateway, `src/transcription/` stub); it needs
**no** `packages/ee`. Nothing here is added to the Level-2 `verify-without-ee`
removal list above — that list is unchanged.

### Set up a channel

One bot / number per deployment. Set the vars for whichever channel(s) you want,
then register the webhook URL with the provider:

- **WhatsApp** (Meta Cloud API) — set `WHATSAPP_ACCESS_TOKEN`,
  `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, and `WHATSAPP_APP_SECRET`
  (optionally `WHATSAPP_GRAPH_VERSION`; `WHATSAPP_BUSINESS_NUMBER` is display
  only). Register the callback URL
  `https://your-domain/api/messaging/whatsapp/webhook`. Meta's GET verification
  handshake is answered with `WHATSAPP_VERIFY_TOKEN`; inbound POSTs are verified
  by the `WHATSAPP_APP_SECRET` request signature and rejected when it's unset
  (fails closed).
- **Telegram** (@BotFather) — set `TELEGRAM_BOT_TOKEN` and
  `TELEGRAM_WEBHOOK_SECRET` (both reused from the existing Telegram integration;
  `TELEGRAM_BOT_USERNAME` is display only). Register the webhook:

  ```
  curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
    -d "url=https://your-domain/api/messaging/telegram/webhook" \
    -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
  ```

  Inbound POSTs are verified against `TELEGRAM_WEBHOOK_SECRET` and rejected when
  it's unset (fails closed).

Tune the idle window with `DHAGA_MESSAGING_IDLE_MINUTES` (default 15).

### Linking a chat to an account

Each user opens **Settings → Messaging**, generates a short-lived link token, and
sends it to the bot to connect their chat. On a single-owner self-host, a chat
that isn't linked falls back to the owner automatically (`DHAGA_OWNER_EMAIL`), so
you can start forwarding before wiring up per-user linking.

### Voice notes

Server-side transcription is a pluggable gateway (`TRANSCRIPTION_PROVIDER`) that
**ships no provider yet**, so a forwarded voice note is refused with "Voice notes
aren't supported yet — coming soon!" rather than being stored unusable. The
refusal is gated on the gateway itself (`hasTranscription()`), so registering a
provider is all it takes for voice notes to start being transcribed and attached
— no change to the messaging code. (This is separate from Dhaga Voice, the
on-device browser dictation used in web quick-add.)

### Idle auto-flush

A session with no DONE is saved once it goes quiet. This runs on the daily cron
(`/api/jobs/daily`) everywhere — the guaranteed floor. For ~15-min flushing,
point a Vercel-Pro cron OR any system scheduler at the standalone worker route:

```
*/15 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain/api/jobs/messaging/flush
```

Requires `CRON_SECRET`; without it the route always returns 401 (fails closed).
**Do not** add a sub-daily entry to `apps/web/vercel.json` — Vercel Hobby caps
crons at once per day and a more-frequent entry can break Hobby deploys. On Hobby
the effective floor is therefore the daily auto-flush plus a "next-message"
self-flush (a fresh forward from an idle chat closes the stale batch first).

## Geocoding for the map view

The map plots contacts from their free-text `location` ("Bengaluru", "London").
Turning that text into coordinates goes through a provider gateway
(`GEOCODING_PROVIDER`, default `nominatim`) — **core / fully self-hostable, no
`packages/ee`, and no API key**: Nominatim (OpenStreetMap) works out of the box.

Two obligations come with the public Nominatim instance, and Dhaga meets both
for you:

- **Max 1 request/second.** The client serializes and spaces its own requests,
  so a batch over hundreds of contacts is throttled by the client itself.
- **Each distinct place is geocoded once, ever.** Answers (including "no such
  place") are stored in the `geocode_cache` table, so nothing is re-queried.
  Nominatim is the only free geocoder whose terms permit storing coordinates,
  which is why it's the default.

Anything that displays these coordinates must credit **© OpenStreetMap
contributors** (ODbL).

Set `NOMINATIM_URL` to run against **your own Nominatim instance** — no shared
rate limit, and your contacts' locations never leave your infrastructure. On the
public instance, set `NOMINATIM_USER_AGENT` to something that identifies your
deployment (Nominatim refuses requests without a real User-Agent).

To plug in a different geocoder entirely, see [PROVIDERS.md](PROVIDERS.md).

## Calendar OAuth scopes (the opt-in full tier)

Connecting a calendar reuses the Google/Microsoft app credentials you already
set for social sign-in (`GOOGLE_CLIENT_ID`/`SECRET`,
`MICROSOFT_CLIENT_ID`/`SECRET`) — core, no `packages/ee`. A connection is
**free/busy only** by default and asks for nothing more:

- Google — `openid email .../auth/calendar.freebusy`
- Microsoft — `openid email offline_access .../Calendars.Read`

Each connection can be **upgraded** by its owner from Settings, which sends them
back through consent for a wider set. Enable these on your OAuth app too, or the
upgrade link fails at the provider with an invalid-scope error and the user is
returned to Settings with `?calendar=error` (their existing free/busy connection
is untouched):

- Google — adds `.../auth/calendar.readonly` and
  `.../auth/calendar.app.created`. `calendar.app.created` is deliberate: it
  confines Dhaga to calendars **it created itself**, so the write-out can only
  ever touch the secondary "Dhaga" calendar, never the user's own.
- Microsoft — swaps `Calendars.Read` for `Calendars.ReadWrite` (Graph has no
  app-created-only equivalent).

What a connection may do is derived from the scope string it was actually
granted — there is no capability column — so a connection made before the
upgrade existed keeps behaving exactly as it did.

## Self-host env var reference

Everything below lives in `apps/web/.env.local` — see
[`apps/web/.env.example`](apps/web/.env.example) for the full annotated list.
None of the `packages/ee/.env.example` vars (`DHAGA_HOSTED_MODE`,
`DHAGA_ADMIN_EMAILS`, `STRIPE_*`) are needed for a plain self-host.

| Var | Required? | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | Your instance's base URL |
| `BETTER_AUTH_TRUSTED_ORIGINS` | No | Extra allowed origins beyond `BETTER_AUTH_URL` (comma-separated or wildcard) — avoids `INVALID_ORIGIN`; Vercel preview URLs are auto-trusted |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical origin for sitemap/robots/OG/llms.txt; defaults to the production deployment origin when unset |
| `DATABASE_URL` | Only on serverless (Vercel) | Otherwise defaults to embedded PGlite |
| `ANTHROPIC_API_KEY` | No | AI features degrade to heuristic parsing / disabled without it |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `DHAGA_OWNER_EMAIL` | No | Event digests, reach-out digest, confirmations digest, morning follow-up reminder, due-follow-up reminder, birthday/anniversary reminder + LinkedIn-export upload reminders (the day-1/3/6/7 nudge after "Get contacts from LinkedIn"). All degrade to a clean no-op when unset |
| `EMAIL_JOBS_HOURLY` | No | Set `true` **only** if you drive `/api/jobs/daily` hourly — then the morning reminder, reach-out digest and confirmations digest send only on the run matching the recipient's local ~08:00 (their Settings time zone). Leave it unset on a once-a-day cron, including Vercel Hobby's: the single run always sends, and a per-user local-day record is what stops duplicates. See "Daily email jobs" above |
| `MORNING_REMINDER_HOURLY` | No | Deprecated alias for `EMAIL_JOBS_HOURLY`, still honoured for one release. Despite the name it now gates all three of those jobs, not just the morning reminder — prefer the new name |
| `TELEGRAM_*` | No | Owner-only bot capture; `TELEGRAM_BOT_TOKEN`/`TELEGRAM_WEBHOOK_SECRET` are reused by WhatsApp/Telegram messaging capture (see "Messaging capture" above) |
| `WHATSAPP_*` | No | WhatsApp inbound messaging capture (Meta Cloud API) — see "Messaging capture" above |
| `DHAGA_MESSAGING_IDLE_MINUTES` | No | Idle auto-flush window for messaging capture (default 15) |
| `TRANSCRIPTION_PROVIDER` | No | STT gateway for forwarded voice notes — no provider ships yet, so voice notes are refused with a "coming soon" reply |
| `DHAGA_WEBHOOK_URL` | No | Outbound automation |
| `SEARCH_PROVIDER`, `FIRECRAWL_API_KEY` | No | Job-change detection + news watchlist |
| `GEOCODING_PROVIDER`, `NOMINATIM_URL`, `NOMINATIM_USER_AGENT` | No | Map view — see "Geocoding for the map view" above; all three have working defaults |
| `CRON_SECRET` | No | Bearer secret for the `/api/jobs/*` cron routes (`detect-signals`, `daily`, `messaging/flush`) — see above |
| `DHAGA_AI_MONTHLY_CAP`, `DHAGA_DATA_DIR`, `DHAGA_EMBEDDINGS` | No | See `.env.example` for defaults |

See [DEPLOYING.md](DEPLOYING.md) for the full deploy walkthrough (Vercel and
single-server options), including the additional `packages/ee` vars if you
*do* want the hosted-product features.

To add an LLM, search engine, embedding model, or external vector store, see
[PROVIDERS.md](PROVIDERS.md). Providers can be distributed as independent npm
packages and registered from the server startup bootstrap.
