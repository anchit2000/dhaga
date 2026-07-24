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
  row (the account falls back to free tier); `pro`/`lifetime` grant unlimited
  cloud AI.
- **Expiry** — an optional date on a paid plan. Once it passes, unlimited AI
  lapses automatically (leave it blank for no expiry).
- **AI credits** — a per-user monthly cloud-AI-action allowance, stored as the
  `ai_monthly_cap_override` setting. This overrides both the free-tier cap and
  `DHAGA_AI_MONTHLY_CAP` for that one user; blank or `0` clears it.

These controls live only in the EE admin panel — a core-only self-host raises
the cap for *everyone* with `DHAGA_AI_MONTHLY_CAP` instead (see the env table
below).

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
- **Session-scoped pooling** (hosted mode only) — tenant scoping works via
  session-level `set_config('app.current_user_id', …)`, which
  transaction-mode poolers (e.g. Supabase's port 6543, PgBouncer, Supavisor,
  Neon's `-pooler` endpoint) silently break by swapping the server backend
  between queries: RLS intermittently returns zero rows *and* the tenant
  setting can leak onto a backend later handed to another user. Use a direct
  connection or a session-mode pooler; the boot guard in
  `packages/ee/src/db/bootstrap.ts` fails loud when the connection string
  looks like a transaction pooler (a `pooler`/`pgbouncer` hostname,
  `pgbouncer=true`, or Supabase's `:6543`). If that heuristic false-positives
  on a pooler you have confirmed is session-scoped, set
  `DHAGA_ALLOW_TRANSACTION_POOLER=true` to downgrade the fail-loud throw to a
  one-time warning.
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

## Self-host env var reference

Everything below lives in `apps/web/.env.local` — see
[`apps/web/.env.example`](apps/web/.env.example) for the full annotated list.
None of the `packages/ee/.env.example` vars (`DHAGA_HOSTED_MODE`,
`DHAGA_ADMIN_EMAILS`, `STRIPE_*`) are needed for a plain self-host.

| Var | Required? | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | Your instance's base URL |
| `DATABASE_URL` | Only on serverless (Vercel) | Otherwise defaults to embedded PGlite |
| `ANTHROPIC_API_KEY` | No | AI features degrade to heuristic parsing / disabled without it |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `DHAGA_OWNER_EMAIL` | No | Event digests only |
| `TELEGRAM_*` | No | Owner-only bot capture |
| `DHAGA_WEBHOOK_URL` | No | Outbound automation |
| `SEARCH_PROVIDER`, `FIRECRAWL_API_KEY` | No | Job-change detection + news watchlist |
| `CRON_SECRET` | No | Required to enable `/api/jobs/detect-signals` — see above |
| `DHAGA_AI_MONTHLY_CAP`, `DHAGA_DATA_DIR`, `DHAGA_EMBEDDINGS` | No | See `.env.example` for defaults |

See [DEPLOYING.md](DEPLOYING.md) for the full deploy walkthrough (Vercel and
single-server options), including the additional `packages/ee` vars if you
*do* want the hosted-product features.

To add an LLM, search engine, embedding model, or external vector store, see
[PROVIDERS.md](PROVIDERS.md). Providers can be distributed as independent npm
packages and registered from the server startup bootstrap.
