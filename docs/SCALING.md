# Dhaga — Read Scale & Database Load

How Dhaga keeps Postgres off the hot path as user count grows. The target: at
~10k users, **most read requests should never touch Postgres**. This doc is the
honest scorecard of which levers are in place and which are still open — it is
kept in sync with the code (see CLAUDE.md Rule 13), so treat an unchecked lever
as genuinely unbuilt, not as drift.

All per-user data is RLS-scoped by `user_id` (see `packages/ee` and
`docs/SELF_HOSTING.md`), which is what makes per-user cache keys and per-user
read routing safe: an entry can only ever hold one tenant's data.

---

## Lever scorecard

| # | Lever | Status | Where |
|---|---|---|---|
| 1 | Per-user cache of hot reads | 🟡 **partial** — shell/config + the graph payload | `apps/web/src/lib/cache/*` |
| 2 | Short transactions (no connection held across network I/O) | 🟢 **followed** on the known hot paths | `repo/graph/apply-extraction.ts`, PR #28 |
| 3 | Read replicas (reads → replica, writes → primary) | 🔴 **not built** | — |
| 4 | Heavy/async work off the request path | 🟢 **largely done** | `repo/extraction-jobs.ts`, `lib/jobs/*` |
| 5 | Rate-limit + meter | 🟡 **meter done, rate-limit minimal** | `lib/ai/metering.ts` |

---

## 1. Per-user cache of hot reads — 🟡 partial

**Shipped (`lib/cache/`, PR #32):** a per-user, mutation-invalidated cache over
`unstable_cache`. `cachePerUser(key, userId, read)` keys the entry *and* its
invalidation tag by `userId` and runs `read` inside `withUserDb(userId)`, so a
cache entry can only ever hold that user's data — a missed invalidation is at
worst same-user staleness, never a cross-tenant leak. There is **no TTL**;
entries live until a write busts the tag via `revalidateTag(tag, { expire: 0 })`.

Two invalidation strategies, one helper module:

- **Tag-invalidated** (`cachePerUser`) — for stable config with a small, known
  write surface. A write busts the tag via `revalidateTag(tag, { expire: 0 })`.
- **Version-keyed** (`cachePerUserVersioned`) — for hot reads too broad to
  invalidate by hand. A cheap per-user version hash of the underlying data is
  folded into the cache key, so a write that changes the data changes the key:
  the next read is automatically a miss, **no explicit invalidation, and a stale
  payload is impossible.** The version query must be far cheaper than the read it
  guards, or the caching earns nothing.

What is cached today:

- **App shell / `getCachedAppConfig`** (tag) — `isAdmin`, `searchWeights`,
  `sttEngine`, `storeCardPhotos`. The `/app` layout is `force-dynamic` (runs on
  every navigation), and this makes the shell cost **zero** Postgres round-trips
  per nav.
- **Node-type ontology / `getCachedNodeTypes`** (tag) — read on home + the
  entities pages; changes only through the node-type mutations.
- **`/api/graph/full` / `getCachedFullGraph`** (version-keyed) — the single
  heaviest read (multi-table assembly of every node/edge). `fetchGraphVersion()`
  is one cheap aggregate round-trip; when it's unchanged the assembly is served
  from cache instead of re-querying Postgres. This composes with the route's
  existing ETag/`304` (which already spares the *client* a re-download): the
  version query still runs per request, but the heavy assembly now runs once per
  graph version across all of a user's clients/instances, not per request.

**Not yet cached — the remaining hot reads:**

- Home dashboard feed (due reach-outs, quiet contacts, daily suggestions).
  Trickier than it looks: several of these reads are **time-derived** (what's
  "due" or "going quiet" changes at a date boundary with no write), so a pure
  data-version key would serve stale results across a day. Cache the data-only
  parts, or fold a coarse time bucket into the key.
- Contact and event list pages — data-only, so version-keyable, but the rows
  carry `createdAt: Date` (project to a JSON-safe shape first — unstable_cache
  serializes, so a Date returns as a string on a hit) and are parameterized by
  page/filter (fold into the key).

**Redis / pluggability (self-hosting).** Every cached read funnels through the
single `lib/cache/per-user.ts` helper, and entries + tag invalidation live in
Next's incremental/data cache — which is swappable via a `cacheHandler` in
`next.config.ts` (Next 16 exposes `cacheHandler`/`cacheHandlers`). So Redis is a
**drop-in, no app-code change**:

- **On Vercel**, `unstable_cache` is already backed by Vercel's durable Data
  Cache (shared across instances/regions) — nothing extra needed.
- **Self-hosting**, the default cache is per-instance (filesystem/memory). A
  single-node instance is fine as-is; a multi-instance deployment sets a
  Redis-backed `cacheHandler` (e.g. `@neshca/cache-handler` or the Next 16
  equivalent) so all instances share one cache and tag invalidation fans out.
  This is the intended path once Redis is available — no change to any
  `lib/cache/*` module or call site.
- If we ever want to bypass Next's cache entirely for a raw Redis client, only
  `lib/cache/per-user.ts` changes (same dependency-inversion shape as the
  `LLMClient`/`SearchClient` gateways).

## 2. Short transactions — 🟢 followed on known hot paths

Never hold a Postgres connection open across network I/O — under transaction
pooling a held connection blocks multiplexing, and Supabase's small connection
cap makes it worse. Read → compute → write, no await-on-network mid-transaction.

- `repo/graph/apply-extraction.ts` is deliberately **not** wrapped in one
  `db.transaction(...)`: `upsertEmbedding()` and `emitWebhook()` make outbound
  calls, so each table's insert commits first and the network calls run after
  (the file documents this and the connection-cap reasoning).
- Extraction/enrichment/embeddings run **off** the request path (lever 4), so
  the LLM/search latency never sits on a DB connection.
- PR #28 reuses tenant connections via `RESET ALL` rather than holding/destroying
  them, and indexed the person-page queries.
- **One query, one connection on the read hot paths.** A repo read that fans out
  several sub-queries with `Promise.all` and a per-source `getDb()` is a trap
  against the tenant pool: those `getDb()` calls do **not** dedupe inside a
  server action, so each checks out a *separate* pooled connection — N of them at
  once from a max-of-`DB_POOL_MAX_TENANT` (default 3) pool. Search hit exactly
  this: `hybridSearch`'s six keyword sources exhausted the pool and returned HTTP
  500. Both search reads now issue a **single** statement on **one** connection —
  `hybridSearch` a `UNION ALL` over all keyword sources with identity joined in
  (`repo/search/keyword/combined`), and `searchGraphTargets` a `UNION ALL` over
  its node kinds — which also collapses their per-source network round-trips
  (~7→1 and 4→1) into one, ~6× faster at the query layer against a region-away
  DB. Rule of thumb for a scoped read: resolve `getDb()` **once**, and prefer one
  round-trip over a fan-out.

Not yet done: a formal audit of all ~14 `db.transaction(...)` sites confirming
none await network I/O mid-transaction. No known offender, but not verified
exhaustively.

## 3. Read replicas — 🔴 not built (future scope)

There is a single `DATABASE_URL` (PGlite embedded, or one Postgres via
node-postgres). No primary/replica split, no read routing. Once per-user
caching (lever 1) stops paying off, routing reads to a replica scales them
horizontally. Sketch for when we build it:

- **Config-gated, opt-in.** A new `DATABASE_URL_REPLICA` (unset by default, so
  self-host and single-node stay exactly as today). Set it → reads route to the
  replica pool, writes/transactions to the primary.
- **Split at one seam.** `getDb()` / `request-scope.ts` is the only place that
  resolves a connection; the read/write split lives there (e.g. a
  `getReadDb()` for list/graph/search reads), not smeared across `repo/*`.
- **RLS still applies.** The replica must connect as the same `NOBYPASSRLS`
  `dhaga_app` role (see [DEPLOYING.md](DEPLOYING.md)) — a replica connecting as a
  `BYPASSRLS` role would leak across tenants exactly as the primary would.
- **Replication lag is the sharp edge.** Read-after-write (create a contact →
  immediately list) can miss on a lagging replica. Route just-written-then-read
  paths to the primary, or read them through the lever-1 cache (which the write
  already refreshed). Decide per read; don't blanket-route.

Until then, lever 1 (caching) is the cheaper win and is where effort goes first.

## 4. Heavy/async work off the request path — 🟢 largely done

- **Extraction & enrichment** run as background jobs: `enrichContactAction` and
  note extraction enqueue an `extraction_jobs` row and return immediately; a
  poller claims jobs atomically (`claimExtractionJob`) so the LLM/search work is
  off the request path.
- **Embeddings** are computed inside that job, not on the request.
- **Signal detection** (job-change / news watchlist) runs through the Anthropic
  **Batch API** on a nightly cron (`lib/jobs/detect-signals`).

## 5. Rate-limit + meter — 🟡 partial

- **Metering — done.** Every AI call is logged to `ai_actions`; the free tier is
  capped per month (`lib/ai/metering.ts`), enforced with a clear UI message.
- **Rate-limiting — minimal.** Auth endpoints use better-auth's built-in rate
  limiter; API-key access has per-key limits via the `apiKey` plugin. There is
  **no** application-level per-user/IP rate limiter on data or AI routes beyond
  the monthly AI cap, and no rate-limiting middleware.

---

## Roadmap (open levers, in rough priority for read scale)

1. **Cache the remaining hot reads per user** — contact/event lists
   (version-keyed, JSON-safe projection) and the data-only parts of the home
   feed. The graph payload is already done via `cachePerUserVersioned`; extend
   the same pattern. Wire a Redis `cacheHandler` for shared multi-instance
   self-hosting (§1).
2. **Read replicas** — the config-gated read/write split sketched in §3.
3. **General rate-limiting** on data/AI routes (per-user + per-IP), to protect
   the DB and cost from runaway load.
4. **Audit transaction sites** for any mid-transaction network I/O.
