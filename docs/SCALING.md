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
| 1 | Per-user cache of hot reads | 🟡 **partial** — shell/config only | `apps/web/src/lib/cache/*` |
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

What is cached today:

- **App shell / `getCachedAppConfig`** — `isAdmin`, `searchWeights`,
  `sttEngine`, `storeCardPhotos`. The `/app` layout is `force-dynamic` (runs on
  every navigation), and this makes the shell cost **zero** Postgres round-trips
  per nav.
- **Node-type ontology / `getCachedNodeTypes`** — read on home + the entities
  pages; changes only through the node-type mutations.

**Not yet cached — the hot volatile reads (the biggest remaining read-scale
lever):**

- Home dashboard feed (due reach-outs, open follow-ups, signals, quiet
  contacts, suggestions) — ~15 queries per visit, all live.
- `/api/graph/full` — hits Postgres every request. It already avoids re-sending
  the multi-MB payload via an ETag/`If-None-Match` → `304` against a cheap
  aggregate version query, with the client caching the body in IndexedDB — but
  the DB is still touched (the version query, plus the full fetch on a miss).
- Contact and event list pages.

These were deliberately left live in PR #32: caching per-tenant *feed* data means
a missed invalidation becomes a stale-data bug, and the invalidation surface is
wide. Doing them well is its own change (see roadmap).

**Store backend & Redis:** entries and tag invalidation live in Next's
incremental/data cache, which is swappable via a `cacheHandler` in
`next.config.ts` (Next 16 exposes `cacheHandler`/`cacheHandlers`). Pointing it at
a **Vercel KV / Upstash Redis** handler moves every entry to Redis with **zero
app-code change** — this is also what makes the cache shared across serverless
instances/regions instead of per-instance in-memory. Separately, every cached
read funnels through the single `lib/cache/per-user.ts` helper, so bypassing
Next's cache for a raw client would be a one-file rewrite (same
dependency-inversion shape as the `LLMClient`/`SearchClient` gateways).

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

Not yet done: a formal audit of all ~14 `db.transaction(...)` sites confirming
none await network I/O mid-transaction. No known offender, but not verified
exhaustively.

## 3. Read replicas — 🔴 not built

There is a single `DATABASE_URL` (PGlite embedded, or one Postgres via
node-postgres). No primary/replica split, no read routing. Supabase offers read
replicas; routing the heavy reads (graph, search, lists) to a replica and writes
to the primary would scale reads horizontally. This is unbuilt.

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

1. **Cache the hot volatile reads per user** (home feed, `/api/graph/full`,
   contact/event lists) with precise write-invalidation — the single biggest
   read-scale lever. Extend the `lib/cache/per-user.ts` pattern; wire a
   Redis/KV `cacheHandler` so the cache is shared across instances.
2. **Read replicas** — route graph/search/list reads to a replica, writes to
   primary.
3. **General rate-limiting** on data/AI routes (per-user + per-IP), to protect
   the DB and cost from runaway load.
4. **Audit transaction sites** for any mid-transaction network I/O.
