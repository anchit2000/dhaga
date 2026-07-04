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
- Registration is open (no invite/approval step) whenever hosted mode is off.
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
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `DHAGA_OWNER_EMAIL` | No | Session digests only |
| `TELEGRAM_*` | No | Owner-only bot capture |
| `DHAGA_WEBHOOK_URL` | No | Outbound automation |
| `DHAGA_AI_MONTHLY_CAP`, `DHAGA_DATA_DIR`, `DHAGA_EMBEDDINGS` | No | See `.env.example` for defaults |

See [DEPLOYING.md](DEPLOYING.md) for the full deploy walkthrough (Vercel and
single-server options), including the additional `packages/ee` vars if you
*do* want the hosted-product features.
