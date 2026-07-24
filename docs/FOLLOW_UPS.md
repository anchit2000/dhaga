# Open follow-ups

Non-blocking engineering follow-ups distilled from internal audit notes. None is
a known, currently-exploitable security vulnerability — tenant isolation was
reviewed (see [`SECURITY.md`](../SECURITY.md)); these are functional gaps,
hardening, and correctness items. Grouped by area.

## Hosted (Dhaga Cloud) multi-tenant

- **Signals / watchlist generation in hosted mode.** The nightly
  signal-detection job runs on the shared, non-tenant-scoped connection, which
  row-level security neutralizes in hosted mode — so watchlist signals are not
  generated in Dhaga Cloud today (this works normally in single-tenant
  self-host). Implement a per-tenant sweep (loop each watched tenant through
  `withUserDb`) or stamp each signal's `user_id` from its contact's owner. Do
  **not** give the global sweep an RLS bypass — that is the one shape that would
  create a cross-tenant issue.
- **Runtime verification of RLS coverage.** `signals` is in `TENANT_TABLES` and
  the generated DDL is correct, but `packages/ee` has no live-Postgres test.
  Add an integration test that asserts RLS actually isolates every tenant table
  at runtime.
- **Telegram owner resolution.** `DHAGA_OWNER_EMAIL` doesn't deterministically
  pin the owner when more than one admin exists (`or(isAdmin, email=owner)`
  with `.limit(1)` and no tiebreaker). Match by email when it's set and add a
  deterministic `orderBy`. Today's only impact is which admin's AI quota absorbs
  bot usage — no data-isolation consequence.
- **Access-request email backfill.** Email case-normalization happens on write;
  before the first real hosted deployment, normalize any pre-existing mixed-case
  `accessRequests.email` rows so a resubmission can't create a duplicate.

## Data integrity / hardening

- **Semantic-search tombstone guarantee (defense-in-depth).** `semanticSearch`
  doesn't filter on `deletedAt`; it trusts embeddings to be removed in lockstep
  with tombstoning (which the delete cascades now do transactionally). Add a
  structural guard (join/filter) so deleted content can't resurface via search
  even if a future code path ever lets embeddings and tombstones diverge.
- **`addSignalAsNoteAction` idempotency.** No guard against a double-click
  creating duplicate notes/facts/edges. Needs `"use server"` action test
  infrastructure (auth/request-scope mocking) that the suite doesn't have yet.
- **`dismissCluster` locking.** Read-modify-write on a shared settings row with
  no lock; worst case a dismissed duplicate-name suggestion reappears once under
  a concurrent double-click. Low priority.

## Performance / scaling

- **Per-request fixed overhead (~1s floor, cross-region).** Every authenticated
  request — any `/app/*` page or `/api/*` route, not just search — pays a fixed
  setup cost before its query runs: Better Auth session validation (a DB lookup),
  then `openTenantConnection` (`pool.connect()` — a fresh TCP+TLS+auth handshake
  when no warm connection is idle, and `idleTimeoutMillis` is 10s so spaced
  requests re-handshake — plus a `set_config('app.current_user_id', …)` query),
  then the query, then `RESET ALL` on release. At ~150ms/round-trip to a
  region-away Postgres (the US-function → Sydney-DB latency flagged in
  [`SCALING.md`](SCALING.md)), those 2–4 serial setup round-trips plus any cold
  handshake dominate small requests — the ~1s floor observed in the search
  benchmarks (`apps/web/scripts/bench`). It is not search-specific and was left
  untouched by the search round-trip work. Enhancement scope, app-wide: (1)
  cache/skip redundant session validation on the hot path; (2) keep the tenant
  pool warm (raise `idleTimeoutMillis`, or a keepalive) so steady traffic stops
  paying the connect handshake — weigh against the max-15-backend Supabase cap;
  (3) co-locate the Vercel function region with the DB region to cut the
  round-trip base latency. Each is a broad infra change, not a per-endpoint fix.

- **Concurrent `getDb()` fan-out (general pattern).** A request that fires 2+
  `getDb()`-acquiring operations concurrently (`Promise.all` over functions that
  each `await getDb()` internally) checks out one tenant-pool connection per
  branch — concurrent `getDb()` calls do not dedupe to one connection inside a
  Server Action — and exhausts the `max=3` tenant pool (HTTP 500). The two search
  reads are fixed (one query on one connection); a repo-wide audit for other
  fan-out sites rides with that change. Rule of thumb (now in
  [`SCALING.md`](SCALING.md) lever 2): resolve `getDb()` **once** per request and
  thread the handle; prefer one round-trip over a fan-out.

## Minor / enhancements

- **Firecrawl retry/backoff.** `firecrawl-client.ts` has no retry on transient
  failures (asymmetric with the Anthropic SDK's built-in retry). Enhancement,
  not a defect.
- **Prompt-export path consistency.** `signal-detection.ts`'s prompt export
  bypasses the normal `llm/index.ts` re-export path (works; purely stylistic).
