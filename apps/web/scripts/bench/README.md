# Search benchmarks

Reproducible latency benchmarks for the two search read paths — the "Search"
tab (`hybridSearch`) and the graph typeahead (`searchGraphTargets`) — plus the
"Ask Dhaga" AI pipeline. Written to diagnose and verify the round-trip
collapse in `repo/search/keyword/combined` and `repo/graph-data/targets`.

All scripts are **read-only** against the DB except where noted, and run against
the **hosted** Supabase database (`apps/web/.env.vercel`) with the seeded
load-test user (see the root `CLAUDE.md`). Results land in `.output/`
(git-ignored).

## Scripts

| Script | What it measures | How to run (from `apps/web`) |
|---|---|---|
| `db-rtt.mjs` | Raw round-trip latency to the DB, and that `Promise.all` on **one** pooled connection does NOT pipeline (N queries = N serial round-trips). | `node --env-file=.env.vercel scripts/bench/db-rtt.mjs` |
| `db-diagnose.mjs` | `EXPLAIN (ANALYZE, BUFFERS)` on the real keyword/typeahead queries + row counts + index inventory. | `node --env-file=.env.vercel scripts/bench/db-diagnose.mjs` |
| `db-ab.mjs` | Query-layer A/B: OLD (6 keyword + 1 identity, serial) vs NEW (1 combined `UNION ALL`), on one RLS-scoped connection. Isolates the DB round-trip cost from request overhead. | `node --env-file=.env.vercel scripts/bench/db-ab.mjs` |
| `search-bench.mjs` | End-to-end via Playwright: logs in as the load-test user and times the normal-search server action, the typeahead REST route, and the AI pipeline. | needs a dev server (below), then `node scripts/bench/search-bench.mjs` |

`search-bench.mjs` env: `BASE_URL` (default `http://localhost:3010`), `EMAIL`,
`PASSWORD`, `LABEL`, `OUT` (default `scripts/bench/.output/baseline.json`).

## Running the end-to-end benchmark against the hosted DB

`next dev` auto-loads `.env.local` (local PGlite), not `.env.vercel`. Launch a
dev server pointed at the hosted DB with the helper (it loads `.env.vercel` at
runtime and pins `BETTER_AUTH_URL` to the local port):

```sh
# terminal 1 — from apps/web
node scripts/bench/dev-hosted.mjs            # serves on :3010 against Supabase

# terminal 2 — from apps/web (once "Ready" appears)
node scripts/bench/search-bench.mjs          # writes .output/baseline.json
LABEL=after OUT=scripts/bench/.output/after.json node scripts/bench/search-bench.mjs
```

The AI step is metered and calls Anthropic — it spends real free-tier AI actions
for the load-test user; keep it small.

## Result (this PR)

Local machine → Supabase `ap-southeast-2`, ~154 ms/round-trip, 1000-contact seed:

- **Normal search**: HTTP **500** (tenant-pool exhaustion) → **200**, working.
- **Query layer** (`db-ab`): 7 serial round-trips **1097 ms** → 1 combined **170 ms** (p50, ~6.4×).
- **Typeahead** (`search-bench`, e2e): **1429 ms → 1027 ms** p50 (−28%; the ~1 s floor is per-request auth/connection overhead shared by every endpoint, not search).
