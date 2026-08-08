# Self-hosting Dhaga without Dhaga Cloud

This repo ships two things in one codebase:

1. **The AGPL core** — the whole CRM (capture, notes, graph, search, drafts,
   export, Telegram, the browser extension API, the per-user `/app` theme and
   font presets) plus real user accounts (better-auth). This is what you get
   when you self-host. Nothing here is crippled or trial-limited.
2. **`packages/ee`** — Dhaga Cloud only: multi-tenant row-level security,
   the pending-approval gate (open signup, `/pending` until an admin or a
   payment lets you in), the admin panel, and Stripe billing. Licensed
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

- Every one of the extension points in
  [`apps/web/src/lib/hosted/gate/`](apps/web/src/lib/hosted/gate)
  (`TenantGate`, `SignupGate`, `BillingGate`, `ApprovalGate`, `AdminGate`,
  `ReferralGate`) short-circuits to its permissive default *before* it ever
  tries to load `@dhaga/ee` — so it doesn't matter whether the package is
  physically present.
- The EE-only routes (`/api/access-requests`, `/api/stripe/webhook`,
  `/api/razorpay/order`, `/api/razorpay/verify`, `/api/razorpay/webhook`)
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
apps/web/src/app/api/razorpay/
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

## In-app feedback (core; the admin viewer is EE)

The feedback button in the app nav is **AGPL core** — the form, the
`POST /api/feedback` route and the `feedback` table all work with
`packages/ee` removed. On submit the row is written first and the owner
notification is sent afterwards, best-effort: with `RESEND_API_KEY` /
`RESEND_FROM_EMAIL` / `DHAGA_OWNER_EMAIL` unset (the self-host default) nothing
is emailed and the report is still stored, and a Resend failure is logged
without failing the request.

What a report carries is a fixed allow-list, one named column each
([`apps/web/src/lib/db/ddl/core/feedback.ts`](../apps/web/src/lib/db/ddl/core/feedback.ts)):
the message, the **route pattern** (`/app/people/[id]`, never a real contact id,
and never a query string), viewport, user agent, locale, timezone, build id and
the submitting user. No contact data, note text or search terms — and the user
is shown that list under the textarea before sending.

The only EE part is the reader: `/app/admin/feedback` pages the table through
the bypass-RLS admin connection, because reading across users is exactly what
`packages/ee` exists for. On a core-only instance the table simply accumulates
and you read it with SQL. The Level 2 removal list above needs no additions —
the page lives under `apps/web/src/app/app/admin/` and its table is an export of
the already-listed `AdminTables.tsx`.

## Disabling just billing (keep admin + the approval queue)

If you're running the hosted product but not ready to charge (a free beta,
for instance), you don't need to touch `DHAGA_HOSTED_MODE`. Simply leave the
processor credentials unset — **both** of them: `STRIPE_SECRET_KEY`, and
`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`. The settings page's "Plan & billing"
section checks for them itself and renders nothing — not a broken "Upgrade"
button, no section at all — while the admin panel and the approval queue keep
working normally. `/pending` then shows no "skip the queue" buttons either, since
the only way in is an admin. Setting just one of the two is a valid
configuration, not a half-off switch: the section appears and sells through
whichever processor is configured.

The whole subscription lifecycle sits behind the same wall. Plan changes
(`packages/ee/src/billing/plan-change/`), cancel and resume, the founding-seat
claim (`billing/founding/`), the charge/refund/dispute ledger
(`billing/payments/`) and the webhook receivers (`billing/webhook/`,
`billing/razorpay/`) are all EE-only, and the `subscriptions` and `payments`
tables they write are created by EE's schema — a core-only self-host has neither
the code nor the tables, and needs neither. The Level 2 removal list above
already covers this: it deletes `packages/ee/` and the two API route folders
wholesale, so new billing modules never add entries to it.

## The pending-approval gate (hosted only)

On a hosted instance signup is **open** — anyone can create an account — but a
new account is created *unapproved* (`user.approved_at` is null, a column
`packages/ee` adds; core's own schema never has it). An unapproved account can
authenticate and reach exactly three things: `/pending`, the checkout that pays
for it, and sign-out. Every other `/app/*` page redirects to `/pending` and
every authenticated API route refuses it, enforced once in
[`apps/web/src/lib/auth/guard.ts`](../apps/web/src/lib/auth/guard.ts).

Approval is granted by an admin approving the access request, by a payment the
processor has **confirmed** (the webhook — never at checkout-intent time, so an
abandoned checkout grants nothing), or by an admin comp plan. A refund or
chargeback revokes it; a cancellation does not.

**None of this exists on a self-host.** Without `packages/ee` the `ApprovalGate`
falls back to its permissive default — `isApproved` is always true, `/pending`
is unreachable, and the `approved_at` column is never even created. Same
open-core pattern as billing and the admin gate
(`apps/web/src/lib/hosted/gate`).

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
(their `current_period_end` is extended, never downgrading a higher tier). If
`STRIPE_REFERRAL_COUPON_ID` is unset when a paying advocate qualifies, the grant
fails loud and the referral stays `pending` for retry rather than silently
half-rewarding.

## Creating the first admin user

There's a deliberate chicken-and-egg problem here: the admin panel can only
promote a user to admin if you're *already* an admin, and (in hosted mode) a
new account lands unapproved on `/pending`, which normally only an admin can
clear. `DHAGA_ADMIN_EMAILS` breaks that circle:

1. Set `DHAGA_HOSTED_MODE=true` and `DHAGA_ADMIN_EMAILS=you@yourdomain.com`
   (comma-separated if more than one) in `packages/ee`'s environment.
2. Go to `/signup` and create an account with that exact email address. These
   emails are approved on the way in rather than parked on `/pending`, and an
   admin is let through regardless of `approved_at` — so an admin can never be
   locked out of their own instance.
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

- **Plan** — set `free`, `pro`, or `power`. `free` removes the subscription
  row (the account falls back to the instance default allowance); `pro` and
  `power` move it onto that plan's monthly allowance — 300 credits a month for
  Pro, 1,000 for Power.
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

**An admin can comp a plan up, but may only lower or remove a plan an admin
granted.** A user who pays through a live Stripe or Razorpay subscription can't
be downgraded from the admin page, because our row and the processor would then
disagree and the card would keep being charged for access we just revoked. Those
changes belong in the customer's own **Plan & billing** settings, or in the
processor dashboard. The plan selector disables the options the server would
refuse and states why — but the refusal itself is enforced server-side and
re-checked inside the transaction, so it holds however the request arrives. The
guard is specifically "there is a live processor subscription behind this row":
a comped plan (the `admin-granted:` sentinel), a cancelled subscription and a
never-completed checkout are all still lowerable, and raising a tier is always
allowed. Setting a genuine former customer back to `free` cancels their
processor subscription before the row is deleted, so a downgrade can't leave a
processor billing a subscription the database has forgotten.

These controls live only in the EE admin panel. On a core-only self-host billing
isn't running, so no plan is ever in play and every user resolves through the
instance-wide default — which is what `DHAGA_AI_MONTHLY_CAP` seeds (see the env
table below).

### Instance-wide AI credit controls (`/app/admin/ai-credits`, hosted/EE)

Beside that per-user override, `/app/admin/ai-credits` (titled "AI cost &
credits") carries five levers that apply to the whole instance — three that size the
**credit** allowance, and two that size the independent **dollar** ceiling
behind it:

- **Plan-cap enforcement** — a master switch that is **on by default**
  (`AI_PLAN_CAP_ENFORCEMENT_DEFAULT = true`). In the shipped state every user is
  held to the monthly allowance for their plan: Free, Pro and Power each have a
  number. That is what the pricing page states — it sells
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
- **Dollar-ceiling enforcement** — a second master switch, also **on by
  default** (`AI_DOLLAR_CAP_ENFORCEMENT_DEFAULT = true`), for a per-user monthly
  ceiling denominated in real inference **dollars** rather than credits. It
  exists because credits stopped bounding spend: three metered features cost 0
  credits on purpose (the nightly signal, person-classification and goal-match
  sweeps — billing them would be ~26× their real cost), so an uncredited sweep
  moves no counter but still costs money. The gate is enforced inside the same
  metering path as the credit cap, so it covers **every** action including those
  three, and it is checked **after** credits — the credit message is the one a
  user can act on (upgrade); this one is the operator's backstop.
- **Multiplier and floor** — the two numbers that turn a plan into a ceiling:
  the plan's monthly **revenue × multiplier** (default `2.0`, so Pro's $8/month
  of revenue becomes **$16/month**), or, for any plan with no recurring revenue,
  a flat **floor** in USD (default `$0.50`). The floor is not a rounding
  detail — Free earns $0, and 0 × 2.0 = $0 would refuse every AI action a free
  user takes, including the ten their credit allowance is meant to buy. The card
  shows the resulting per-plan ceiling table live as you change either number.
  A per-user `ai_monthly_dollar_cap_override` beats both (`0` is a valid
  override, unlike its credit sibling).

**On a core-only self-host the dollar gate is inert.** Its bottom rung is
deliberately *no ceiling* rather than a number: with billing not running no plan
is ever in play, so `effectiveMonthlyDollarCap()` resolves to `null` and never
refuses an action. That is the opposite of the credit ladder, whose bottom rung
(the instance default) is a real number — and it is intentional, because a
self-hoster pays their own provider bill and inventing a dollar ceiling they
never asked for would break their instance. **There is no new environment
variable**: the multiplier, floor and switch live in `ai_budget_settings` and
there is no `DHAGA_AI_MONTHLY_DOLLAR_CAP`. `DHAGA_AI_MONTHLY_CAP` is still
credits, and still the only AI-budget env var. Resolver:
[`apps/web/src/lib/ai/metering/dollar-cap.ts`](../apps/web/src/lib/ai/metering/dollar-cap.ts);
rationale and the per-plan numbers in BRD §8.3.

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
`DHAGA_AI_MONTHLY_CAP` seeds, else the shipped 10 credits a month — and the
dollar ceiling resolves to *none*, as described above. **Nothing here
is required from `packages/ee` to self-host**, and the Level 2 removal list above
needs no additions — the new admin page and its server actions and components
live under `apps/web/src/app/app/admin/`, `apps/web/src/lib/actions/admin/` and
`apps/web/src/components/app/admin/`, which are already on it. The dollar gate
added files in those same three directories (plus `packages/ee`, which Level 2
removes whole); its own resolver, cost helper and constants are core, and the
`ai_actions.batch` column it reads is created by the core DDL like any other.

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

**The MCP server is fully core too — your instance is a first-class MCP server,
not a degraded one.** `lib/mcp/`, the `/api/mcp` route and the two
`.well-known` discovery routes import nothing from `@dhaga/ee`, so they're
unaffected by Level 1 *and* Level 2 and don't belong on the deletion list above —
that list is unchanged. Any MCP client (claude.ai, Claude Desktop/Code, ChatGPT,
Cursor) connects to `https://your-domain/api/mcp` and gets the same ten tools the
hosted instance serves: six read-only ones that cost no AI credits, and four
additive write ones. There is deliberately **no delete, merge, bulk-action,
export or admin tool** — a prompt-injected client must not be able to cascade
away a graph.

Two credentials work, and neither needs a new env var:

- **A personal access token** — create one under Settings → API keys and send it
  as `x-api-key`. This is the simplest path, and the only one local/stdio clients
  need: `claude mcp add --transport http dhaga https://your-domain/api/mcp
  --header "x-api-key: <token>"`. Creating a token is payment-gated on Dhaga
  Cloud (the `multi_device_sync` plan feature), but **not here**: with no billing
  configured `currentPlan()` resolves to `self_hosted`, which holds every
  feature, so token creation is unrestricted on a self-host.
- **OAuth 2.1**, if you want one-click connectors. Your instance *is* the
  authorization server (better-auth's `mcp` plugin), with Dynamic Client
  Registration at `/api/auth/mcp/register` and RFC 8414 / RFC 9728 discovery at
  `/.well-known/oauth-authorization-server` and
  `/.well-known/oauth-protected-resource`. The one thing to get right is
  **`BETTER_AUTH_URL`**: the issuer is derived from it, so if it doesn't match the
  URL clients actually reach you on, they will reject tokens you issued yourself.

The `/api/mcp` endpoint itself carries the same `multi_device_sync` gate on
Dhaga Cloud — it has to, because the OAuth path above never touches a token, so
gating token creation alone would leave the connector route wide open
(`mcpPlanGateResponse` in `apps/web/src/lib/mcp/auth.ts`, which answers
`403 {"error": "plan_required"}` rather than a 401 that would loop the client
through login). On a self-host it is inert for the same reason token creation
is: `currentPlan()` resolves to `self_hosted`, which holds every feature.

The same applies to **inbound WhatsApp/Telegram capture**: linking a chat
(`generateMessagingLinkTokenAction`) is gated on Cloud and unrestricted here.
Unlinking and processing messages from an already-linked chat are ungated
everywhere — a plan must never remove someone's ability to disconnect a channel
that reads their messages, nor silently drop what they are still sending.

Three global auth tables are added to the boot DDL for the OAuth server
(`oauth_application`, `oauth_access_token`, `oauth_consent` — `lib/db/ddl/oidc.ts`).
They're applied automatically by the same `ddl_history` self-heal as everything
else, so there is no migration step; they are instance-wide auth tables, not
tenant tables, and are deliberately not in EE's `TENANT_TABLES`. See
`apps/web/content/docs/guide/mcp.mdx` for the user-facing side.

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

Requires `CRON_SECRET` and a search provider. Since 2026-08-08 the default
provider is **Anthropic's own server-side `web_search` tool**, so
`ANTHROPIC_API_KEY` on its own is enough — `FIRECRAWL_API_KEY` is optional and
only takes precedence where you set it. See "Search providers" in
[PROVIDERS.md](PROVIDERS.md) and `.env.example`. Without `CRON_SECRET` the route
always returns 401, so it's safe to leave unconfigured if you don't want the
feature. Without any search provider the sweep returns `{ skipped: "no_search" }`
and writes nothing, and the contact-page toggle that would enrol someone in it is
greyed out "Coming soon" rather than arming a scan that can't run — see "Optional
providers, and what the UI does without them" below.

Two honest caveats. **This path has never been run against a live Anthropic
key** — it typechecks and is unit-tested, but no end-to-end sweep has been
observed, so treat it as armed rather than proven. And it is **not free**:
Anthropic bills $10 per 1,000 searches on top of charging every retrieved page
as input tokens to the searching model. The token half is recorded against your
instance's dollar ceiling; the per-search charge is not (see BRD §8.3).

### Nightly curation passes (person/service classification, goal matching)

Two more sweeps ride the `/api/jobs/daily` endpoint below rather than a queue,
both over the Anthropic **Message Batches API** and both **zero-credit** (see
BRD §8.3):

- **Person-vs-service classification** labels imported address-book rows
  ("Ola Support", "Vegetable Vendor") so they stop appearing on proactive
  surfaces. Nothing is deleted or hidden — the row stays in People, search,
  merge, Wrapped and every export.
- **Goal matching** judges contacts against the one objective a user has set,
  writing the cohort the Home briefing draws its daily slice from.

Both are two-phase, exactly like signal detection: one invocation applies the
previous run's batch and submits a fresh one, so a graph drains over several
nights rather than in one call. Each is capped per run
(`PERSON_CLASSIFICATION_RUN_CAP` 1,000 contacts, `GOAL_MATCH_RUN_CAP` 150) and
each reports a `remaining` count in the endpoint's JSON — contacts still to
classify, and cohort slots still to fill — so you can watch a backfill drain.
Both need a working LLM provider; without one they
return `skipped: "no_llm"` and change nothing. They run **before** the reach-out
digest on purpose, so the email reflects the freshest labels and cohort.

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
then the whole batch is planned in ONE LLM call that reads every message
together, deterministic code applies that plan, and the bot replies with a
per-person summary.

**This needs a working LLM.** Unlike web quick-add, which falls back to an
offline heuristic parser, batch capture has no non-AI path: an offline parser
cannot do cross-message attribution at all, so falling back would quietly build
the wrong graph. With no LLM configured the batch is left **unprocessed and
retryable** and the sender is told — nothing is written on a guess. Self-hosters
running without cloud AI should expect forwarded batches to sit unsaved rather
than to degrade.

The schema for this is created by the core DDL like everything else, with no
migration step: `messaging_sessions` carries `processed_at` / `summary` /
`error` and `messaging_session_items` carries `outcome_kind` / `outcome`, which
together are what the capture log (Settings → Messaging) reads back. On a
self-host these tables have no `user_id` column, so the batch list pages on a
`(created_at, id)` index; the hosted build adds a tenant-leading equivalent in
`packages/ee`, and neither is needed by the other.

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
  (optionally `WHATSAPP_GRAPH_VERSION`; `WHATSAPP_BUSINESS_NUMBER` is not used
  for auth, but set it — it is what builds the scan-to-link QR in Settings, and
  without it users are back to retyping the token). Register the callback URL
  `https://your-domain/api/messaging/whatsapp/webhook`. Meta's GET verification
  handshake is answered with `WHATSAPP_VERIFY_TOKEN`; inbound POSTs are verified
  by the `WHATSAPP_APP_SECRET` request signature and rejected when it's unset
  (fails closed).
- **Telegram** (@BotFather) — set `TELEGRAM_BOT_TOKEN` and
  `TELEGRAM_WEBHOOK_SECRET` (both reused from the existing Telegram integration).
  Set `TELEGRAM_BOT_USERNAME` too: it builds the `t.me/<bot>?start=<token>`
  scan-to-link QR, which is the one-tap path — Telegram delivers that payload
  back as `/start <token>` and the chat links with nothing typed. Register the
  webhook:

  ```
  curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
    -d "url=https://your-domain/api/messaging/telegram/webhook" \
    -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
  ```

  Inbound POSTs are verified against `TELEGRAM_WEBHOOK_SECRET` and rejected when
  it's unset (fails closed).

Tune the idle window with `DHAGA_MESSAGING_IDLE_MINUTES` (default 1440 — 24h, see
"Idle auto-flush" below) and how large an unclosed batch may grow with
`DHAGA_MESSAGING_MAX_OPEN_ITEMS` (default 10).

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

### Idle auto-flush, and finishing what a run started

A session with no DONE is saved once it goes quiet. This runs on the daily cron
(`/api/jobs/daily`) everywhere — the guaranteed floor, and the reason the default
idle window is **24h**: on a once-a-day scheduler, promising a shorter one tells
the sender their capture is saved when it isn't.

The same sweep also **recovers batches stuck in `processing`** (older than
`MESSAGING_PROCESSING_STALL_MINUTES`, 60). A flush runs in a background `after()`
on a function with a hard time ceiling, so a large batch can be killed mid-walk;
nothing else would ever retry it, and the sender would have been told
"Processing…" and never heard back. Re-driving is safe because each item carries
a `processed_at` stamp — the walk resumes from unprocessed items only, so a retry
can never duplicate the contacts and notes an earlier pass wrote. That stamp is
also what lets one run cap itself at `MAX_SESSION_ITEMS` (50) without truncating:
the overflow stays unprocessed and the next sweep drains it.

If you shorten the idle window, point a Vercel-Pro cron OR any system scheduler
at the standalone worker route so the promise matches reality:

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

## Optional providers, and what the UI does without them

Everything above is core and self-hostable, but four capabilities need
something this repo deliberately doesn't ship: a third-party provider, or a
browser feature. Dhaga is in beta, and the product rule is that a control which
cannot do its job is **greyed out with a "Coming soon" label and the reason** —
never rendered live to silently no-op. So an unconfigured provider is visible in
the UI rather than a mystery. Every one of these is a **runtime** check, so the
control lights itself up the moment the missing piece is in place, with no code
change and no extra flag to flip.

| Capability | Needs | What happens without it |
|---|---|---|
| Job-change detection + news watchlist | `ANTHROPIC_API_KEY` (the default provider is Anthropic's own server-side web search), or `FIRECRAWL_API_KEY`, or another registered `SEARCH_PROVIDER` | `hasSearch()` is false, so `/api/jobs/detect-signals` returns `{ skipped: "no_search" }` and writes no signals, and the contact page's "Watch for job changes & news" toggle is greyed out "Coming soon" instead of arming a scan that would never run. **Since 2026-08-08 an instance that set `ANTHROPIC_API_KEY` for the other AI features has this on by default** — the same runtime `hasSearch()` check un-greys the toggle with no code change and no extra flag. Unproven, though: no end-to-end sweep has been run against a live key, and searches cost $10/1k on top of tokens |
| Semantic (vector) search | `DHAGA_EMBEDDINGS` left unset (it defaults on), plus pgvector or a `DHAGA_VECTOR_STORE` | With `DHAGA_EMBEDDINGS=off`, `embeddingsEnabled()` is false: search runs on keywords + trigram only, and the search palette's **Semantic similarity** weight slider is greyed out "Coming soon" because it would be weighting an empty result set |
| SMS | `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` | `smsEnabled()` is false and no code can be delivered. **This one stays gated even with Twilio configured**: there is no phone-number sign-in path anywhere in the app (email, magic link, passkey and social are the ways in), so Settings → Security → Phone number is "Coming soon" either way — only the wording changes, to name which half is missing |
| Voice notes (in-browser dictation) | **WebGPU in the visitor's browser** — not a server setting you can supply | Dhaga Voice runs the Moonshine speech model on the user's own device and has no CPU/WASM fallback, so on iOS Safari and most mobile browsers the mic button renders greyed out "Coming soon" up front rather than failing after a tap. Chrome or Edge on desktop works today. (Transcribing voice notes *forwarded to the bot* is a separate, server-side gateway — see `TRANSCRIPTION_PROVIDER` above, which ships no provider yet either) |

The copy for all four lives in one place,
[`apps/web/src/utils/constants/coming-soon.ts`](../apps/web/src/utils/constants/coming-soon.ts),
and the affordance is
[`apps/web/src/components/app/ComingSoonNotice.tsx`](../apps/web/src/components/app/ComingSoonNotice.tsx).
Nothing in it links to pricing: "coming soon" is an admission that nobody can
have the feature yet, not an upsell.

Two things this table does **not** cover, because they degrade rather than
gate: `ANTHROPIC_API_KEY` (see the env table below — AI features fall back to
heuristic parsing or switch off, and messaging batch capture leaves a forwarded
batch unprocessed and retryable), and `RESEND_*` (every recurring email becomes
a clean no-op).

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
| `DHAGA_MESSAGING_IDLE_MINUTES` | No | Idle auto-flush window for messaging capture (default 1440 = 24h, matching the daily cron) |
| `DHAGA_MESSAGING_MAX_OPEN_ITEMS` | No | How many items an unsaved batch may hold before the bot refuses more and asks for DONE (default 10) |
| `TRANSCRIPTION_PROVIDER` | No | STT gateway for forwarded voice notes — no provider ships yet, so voice notes are refused with a "coming soon" reply |
| `DHAGA_WEBHOOK_URL` | No | Outbound automation |
| `SEARCH_PROVIDER`, `FIRECRAWL_API_KEY` | No | Job-change detection + news watchlist. Both optional: leave them unset and search runs on `ANTHROPIC_API_KEY` via Anthropic's own web-search tool, which is the default. Set `FIRECRAWL_API_KEY` and Firecrawl wins instead; `SEARCH_PROVIDER` overrides both. With no key at all the nightly sweep no-ops and the watch toggle is greyed out — see "Optional providers" above |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | No | SMS delivery. Note phone-number sign-in is unbuilt regardless, so the Settings phone section stays gated either way — see "Optional providers" above |
| `GEOCODING_PROVIDER`, `NOMINATIM_URL`, `NOMINATIM_USER_AGENT` | No | Map view — see "Geocoding for the map view" above; all three have working defaults |
| `CRON_SECRET` | No | Bearer secret for the `/api/jobs/*` cron routes (`detect-signals`, `daily`, `messaging/flush`) — see above |
| `DHAGA_EMBEDDINGS` | No | Defaults **on**. Set `off` to skip local semantic indexing — search then runs keyword + trigram only and the semantic weight slider is greyed out; see "Optional providers" above |
| `DHAGA_AI_MONTHLY_CAP`, `DHAGA_DATA_DIR` | No | See `.env.example` for defaults |

See [DEPLOYING.md](DEPLOYING.md) for the full deploy walkthrough (Vercel and
single-server options), including the additional `packages/ee` vars if you
*do* want the hosted-product features.

To add an LLM, search engine, embedding model, or external vector store, see
[PROVIDERS.md](PROVIDERS.md). Providers can be distributed as independent npm
packages and registered from the server startup bootstrap.
