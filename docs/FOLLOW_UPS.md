# Open follow-ups

Non-blocking engineering follow-ups distilled from internal audit notes. None is
a known, currently-exploitable security vulnerability — tenant isolation was
reviewed (see [`SECURITY.md`](../SECURITY.md)); these are functional gaps,
hardening, and correctness items. Grouped by area.

## Connection-hygiene sweeps (2026-07-26)

Two passes landed the connection-hygiene model — acquire a connection, use it for
a read (or a write), and **release it before any slow non-DB work** (LLM calls,
web search, webhooks); never hold one across slow I/O and never fan out multiple
`getDb()` checkouts concurrently. **PR #100** made every DB-mutating server action
run in ONE scoped connection (`mutation()` / short-scope `withUserDb`), made
mutation surfaces optimistic + resilient (canonical `FormError`/`toastError`,
never the error boundary), turned on session `cookieCache`, and made RLS scoping
transaction-local so the same code runs on the session pooler (5432) and the
transaction pooler (6543) — see [`SCALING.md`](SCALING.md) §1–§2. **This
follow-up PR** closed the remaining hold-across-slow-I/O and `getDb()` fan-out
gaps and the correctness/doc items below.

**Resolved in this follow-up sweep:**

- **`importContacts` no longer holds its connection across the webhook.** It takes
  a `skipWebhook` option and returns `{ created, skipped, format }`; the action
  emits `contacts.imported` AFTER `mutation()` releases the connection.
- **Worker-path metering confirmed short-scoped.** `lib/ai/enrich.ts` was already
  in the three-phase form (budget checkout released before the LLM/web-search
  call), matching `brief.ts` / `draft.ts` / `contact-extraction.ts` /
  `card-scan.ts` — no change needed.
- **Typed repo errors for create-with-unique-name.** `createNodeType` /
  `createRelationshipType` throw a typed `PreconditionError` (`lib/repo/errors.ts`)
  for the duplicate/invalid-name precondition; the actions surface that message
  but re-throw genuine infra failures into `mutation()`'s standard retry copy +
  server log.
- **EE `getDb()` fan-out + connect-retry gap.** `getPool()` is now wrapped at the
  pool level (`packages/ee/src/db/connect-retry.ts` `withConnectRetry`, patching
  `pool.query` + `pool.connect`), so every `drizzle(getPool())` read (admin /
  access-request / billing / referrals) inherits transient backoff+jitter. The
  admin/access-request `Promise.all` fan-outs (`dashboardCounts`, `listUsersPage`,
  `listSubscriptionsPage`, `listAccessRequestsPage`) now run on ONE
  `openAdminConnection()` client instead of 2–3 concurrent tenant-pool checkouts.
- **Semantic-search tombstone guard.** `PgVectorStore.search()` structurally
  excludes embeddings whose owning note/fact is soft-deleted (per-`ownerType`
  `EXISTS` guard) — defense-in-depth atop the transactional delete cascade.
- **`addSignalAsNoteAction` idempotency.** An upfront atomic claim
  (`UPDATE signals SET status='noted' WHERE id=$1 AND status<>'noted' RETURNING`)
  makes a double-click a no-op; the claim shares the action's transaction, so a
  later failure rolls it back for a clean retry.
- **`dismissCluster` race-free.** A single lock-free upsert (`appendToSettingArray`,
  `jsonb_agg(DISTINCT …)`) replaces the read-modify-write, covering the
  first-insert race too.
- **Telegram owner resolution deterministic.** Exact `DHAGA_OWNER_EMAIL` match
  first, else the earliest admin via `orderBy(asc(createdAt), asc(id))` so
  `.limit(1)` can't flip between requests.
- **Access-request email backfill.** An idempotent `DO $$…$$` block appended to the
  EE DDL lowercases pre-existing mixed-case `access_requests.email`, deduping PK
  collisions by `row_number()` before the `lower()` update.
- **Signals per-tenant sweep (hosted).** `runSignalDetection` loops each tenant
  through `withUserDb` in hosted mode (tenants enumerated from the non-RLS auth
  `user` table — NOT an RLS bypass), while self-host runs the single global scan
  unchanged; the LLM/web-search calls stay outside every DB scope. **Still needs
  live multi-tenant verification** (below).
- **RLS runtime integration test added** (`packages/ee` `rls-isolation.integration.test.ts`,
  skip-guarded on `DATABASE_URL`): asserts every `TENANT_TABLES` table isolates at
  runtime and that `user_id` is GUC-stamped, with a `pg_policies` check that fails
  the suite if a new tenant table is added without a spec.
- **Firecrawl retry/backoff** (2 retries, exponential backoff + jitter,
  transient-only) — closes the asymmetry with the Anthropic SDK's built-in retry.
- **Prompt-export path consistency.** The `signal-detection` prompt re-exports
  through the `llm/index.ts` barrel like every sibling prompt.
- **Stale pooling prose corrected** in `docs/DEPLOYING.md`, both self-hosting
  `.mdx` pages, `SECURITY.md`, and the tenant-isolation blog post (transaction-local
  scoping, no `RESET ALL`, both poolers; no session-mode boot guard /
  `DHAGA_ALLOW_TRANSACTION_POOLER` escape hatch anymore).

**Still open from the connection-hygiene work:**

- **Verify on a real pooled DB before Pro.** The EE integration suites
  (`tenant-reuse.integration.test.ts` and the new
  `rls-isolation.integration.test.ts`) are skip-guarded without `DATABASE_URL`;
  run them against a real session-pooled DB, and ideally the 6543 transaction
  pooler, before flipping `DATABASE_URL` at Supabase Pro. This is the single
  verification gate that also covers the transaction-scope and hosted-signals
  changes below.
- **Live multi-tenant verification of the hosted signals sweep.** The per-tenant
  loop is correct by construction and leaves self-host untouched, but was not run
  against a live multi-tenant RLS DB.
- **Pre-existing >150-line files nudged by the sweeps (directory-split still
  deferred — surgical scope; the splits would also collide with the hygiene
  edits):** `lib/actions/notes.ts`, `contacts.ts`, `import.ts`,
  `lib/hosted/gate.ts`, `components/app/home/TodaySuggestions.tsx`.
- **Optional (surfaced, not adopted):** cache the home `StatStrip` via
  `cachePerUserVersioned` (rejected — adds ~24h staleness to a decorative
  sparkline); a shared `OptimisticSwitch` to de-dupe the amber toggle markup.
- **Minor fan-out residuals (safe today):** `repo/relationships/list.ts`
  `listContactRelationships` is shape-fragile (would fan to 2 checkouts if ever
  called outside a scoped context; its only caller is RSC-pinned), and
  `repo/embeddings.ts` `countUnindexed` fans one vector lookup per row (only
  reached when `embeddingsEnabled()`, which is off on Vercel serverless).

## Hosted (Dhaga Cloud) multi-tenant

- **Daily-digest + morning-reminder email jobs run on the default connection.**
  Like the signal-detection job used to, `runDailyDigest` and the morning-reminder
  job run unscoped, so in hosted (multi-tenant RLS) mode they only produce output
  for the self-host case. Give them the same per-tenant `withUserDb` fan-out the
  signal-detection job now uses (enumerate tenants from the non-RLS auth `user`
  table; do **not** give the sweep an RLS bypass on tenant tables).
- **Telegram owner resolution.** Resolved (deterministic email-first + `orderBy`).
  Kept here only as a pointer; today's only impact was which admin's AI quota
  absorbed bot usage — no data-isolation consequence.

## Performance / scaling

- **Per-request fixed overhead (~1s floor, cross-region).** Every authenticated
  request pays a fixed setup cost before its query runs. Two of the original three
  contributors are now addressed: session validation is `cookieCache`d (PR #100)
  and `RESET ALL` is gone from the release path. The remaining levers are broad
  infra changes, not per-endpoint fixes: (1) keep the tenant pool warm (raise
  `idleTimeoutMillis` or add a keepalive) so steady traffic stops paying the
  connect handshake — weighed against the max-15-backend Supabase cap; (2)
  co-locate the Vercel function region with the DB region to cut the round-trip
  base latency (the US-function → Sydney-DB hop flagged in [`SCALING.md`](SCALING.md)).
- **Concurrent `getDb()` fan-out — resolved for the identified sites.** The write
  path (PR #100), the two search reads, and the EE admin/access-request fan-outs
  (this sweep) all run on one connection. Rule of thumb (now in
  [`SCALING.md`](SCALING.md) lever 2): resolve `getDb()` **once** per request and
  thread the handle; prefer one round-trip over a fan-out. Minor residuals noted
  in the connection-hygiene section above.

## Self-hosting / packaging

- **Relocate the admin/EE surface into `packages/ee`.** The "provably-100%-AGPL"
  proof (`.github/workflows/ci.yml`'s `verify-without-ee` job and
  `docs/SELF_HOSTING.md` "Level 2") deletes a hand-maintained list of admin files
  that physically live in `apps/web/src` but depend on removed EE code:
  `app/app/admin/`, `lib/actions/admin/`, `components/app/admin/`,
  `components/app/table/AdminTables.tsx`, and the `api/stripe` +
  `api/access-requests` routes. Every new admin/EE feature has to be added to that
  list by hand, and forgetting silently breaks the pure-AGPL build. Move the
  admin/EE UI + server actions into `packages/ee` and load them dynamically (the
  way `apps/web/src/lib/hosted/gate.ts` already loads EE *logic*), so Level 2
  collapses to just "delete `packages/ee`" with no stragglers to enumerate.
  **This shifts those files from AGPL to PolyForm Shield — a licensing decision,
  not just a refactor — so it needs an explicit owner call and belongs in its own
  PR, not a hygiene sweep.** (Level 1 self-hosting is unaffected either way.)

## Minor / enhancements

- **Prompt-export path consistency** — resolved (signal-detection prompt now flows
  through the `llm/index.ts` barrel). Firecrawl retry/backoff — resolved (see the
  connection-hygiene sweep above).
