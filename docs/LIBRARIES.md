# Library adoption plan

Policy: **library-first**. Before hand-rolling interactive behavior (tables,
forms, client data fetching, virtualization, cropping), check this document.
If an adopted library covers it, use the library; if a new need appears,
evaluate an established library before writing custom code. Reinventing
functionality a maintained library already provides is treated as a bug.

Audited 2026-07-20 against `apps/web` and `apps/mobile`. Versions/status
verified via web research the same day.

---

## Adopt now

### 1. TanStack Query (`@tanstack/react-query` v5)

**Replaces:** every hand-rolled client fetch/poll loop.

- `components/app/contact/ExtractionStatus/useExtractionPoller.ts` — 128 lines
  of manual `setTimeout` scheduling, retry counting, and failure caps. TanStack
  Query expresses this as `refetchInterval` (a function returning `false` stops
  polling when no job is active) + `retry` — and fixes lifecycle edge cases we
  currently manage with five refs.
- `components/app/contact/OnDemandNetwork.tsx` (12 state hooks),
  `components/app/graph/WarmPathPanel/`, and
  `components/app/relationships/AddRelationshipDialog/TargetPicker.tsx` —
  manual `fetch` + loading/error `useState` triples.

**Does not change:** server components stay server components. Query is only
for interactive client islands that fetch after mount. The graph payload boot
(`use-graph-data.ts`, SWR + ETag + IndexedDB) stays as-is for now — it is
entangled with the layout pipeline and perf beacons; revisit with §5.

Mobile will need TanStack Query at M1 anyway (it is the standard for Expo data
fetching), so adopting on web first keeps one mental model across platforms.

### 2. TanStack Table (`@tanstack/react-table` v8) inside `DataTable`

**Replaces:** the filter/pagination logic in `components/app/table/DataTable.tsx`.

Our `DataTable` (used by `PeopleTable`, `EventsTable`, import `ReviewTable`,
`AdminTables`) hand-rolls per-column filtering and pagination — and has **no
sorting at all**. TanStack Table is headless (~15 kB): we keep our exact
markup, shadcn `Table` primitives, and amber styling, and swap the state logic
for its row models. That buys sorting, column visibility, and row selection
(future bulk actions) for free instead of growing our own.

The shadcn data-table pattern is the canonical integration — `DataTable`
remains the single shared wrapper; call sites keep their column-def API.

### 3. nuqs (URL state)

**Replaces:** the manual `URLSearchParams` + `router.replace` wiring in
`DataTable`'s server mode (`navigate()`), and any future filter/tab/page state
that belongs in the URL. Type-safe parsers, App Router native, 5.7 kB.

---

## Adopt when the milestone needs it

### 4. react-hook-form + `@hookform/resolvers` (Zod)

Forms today are `useState` + server actions (`useActionState`), which is
idiomatic Next.js and fine for simple forms — **do not rewrite those**. Adopt
RHF for the complex client-heavy forms (`EntityForm`, `ContactForm`,
`QuickAddForm`) the next time one grows validation or field-array needs. RHF
is the 2026 default, integrates with `useActionState`, and its Zod resolver
reuses our `packages/core` schemas. (TanStack Form is the type-safety-maximal
alternative; RHF wins on maturity and server-action ergonomics.)

### 5. TanStack DB + ElectricSQL (local-first sync) — **architecture decision**

TanStack DB 0.6 (March 2026) added SQLite-backed persistence across browser,
React Native/Expo, and edge runtimes, and pairs with ElectricSQL's Postgres
Sync for incremental sync. That maps almost exactly onto our local-first
architecture ("the phone is the source of truth, cloud is sync + heavy
compute") — and we already ship ElectricSQL's PGlite in the web app. This is
the strongest candidate for the sync milestone, but it is a BRD-level
decision, not a drop-in: evaluate against the planned op-sqlite + sqlite-vec
mobile store before committing. Flagged for discussion, not silent adoption.

### 6. Virtualization — TanStack Virtual (web), FlashList v2 (mobile)

Adopt the moment any list/table renders ~1k+ rows client-side (contacts table
at scale, import review of large CSVs). FlashList v2 is the recommended list
for new-architecture Expo apps and is the default choice for M1 mobile lists.
The graph canvas is out of scope — sigma.js already owns that surface.

### 7. react-easy-crop

`components/app/PhotoCropper/` is five files of custom crop math, gesture
handling, and overlay rendering. react-easy-crop (6.7 kB, maintained) covers
drag/zoom/pinch with touch support. Swap next time the cropper needs a
feature (rotation, aspect presets); no urgency while it works.

### 8. cmdk

The shadcn `Command` wrapper around cmdk (powers Linear/Raycast palettes)
would replace SearchPalette's hand-rolled keyboard handling and list
navigation. Ours has custom modes (search vs. metered Ask, dictation, weight
tuner) that don't map 1:1 — evaluate when SearchPalette next grows; medium
value.

### 9. Rate limiting — `rate-limiter-flexible` (pluggable store)

Lever 5 in [SCALING.md](SCALING.md): better-auth only rate-limits its own
`/api/auth/*` routes (plus per-key limits via the `apiKey` plugin) — there is no
general per-user/IP limiter on data or AI routes. **`rate-limiter-flexible`** is
the pick *because* it's pluggable: one API over Memory, Postgres, Redis,
Memcached, Mongo, and Cluster backends, so the store swaps by config with zero
call-site change — the same dependency-inversion shape as our `LLMClient` /
`SearchClient` / cache gateways. Wrap it in an app-owned `RateLimiter` interface
+ `getRateLimiter()` factory keyed off a `RATE_LIMIT_BACKEND` env, apply it at
the route/action boundary through one `enforceRateLimit(key, bucket)` helper (not
scattered), and take identity from better-auth (`requireUserIdFromRequest` /
`getCurrentUser`) with the limiting logic ours.

- **Memory** now — zero infra, works without Redis. Caveat: per-instance on
  serverless, so limits are approximate (a user hitting N Vercel lambdas gets N×
  the limit). Fine for single-node self-host and a first pass.
- **Postgres** (`RateLimiterPostgres`) — distributed limiting on the DB we
  already have, before Redis exists. Costs DB writes, so use it only where
  accuracy matters (AI endpoints, `/api/capture`), not everywhere.
- **Redis** (`RateLimiterRedis`) — the drop-in once Redis lands; same code. This
  pairs with the cache's Redis story (SCALING.md §1): one Redis, two uses.

**Status (built):** the gateway ships with the **Memory** backend —
`lib/ratelimit/` (`RateLimiter` interface + `MemoryRateLimiter` +
`getRateLimiter()` factory + `enforceRateLimit`), limits in
`utils/constants/ratelimit.ts`. Wired into `/api/capture` (429 + `Retry-After`)
and every AI call via `assertAiBudget` (burst guard surfaced as the existing
`AiBudgetError`, so no call site changed). Postgres/Redis remain future factory
cases behind `RATE_LIMIT_BACKEND`.

Not the alternatives: **TanStack Pacer** is the natural thing to reach for
(we're TanStack-first), but it is **client-side only** by its own docs
("currently only a front-end library"; in-memory per instance, no shared/
persistent store). It rate-limits how often a *function* runs in the browser —
so it cannot protect a server route (a client-side limit is trivially bypassed
and doesn't exist across instances). It *is* a good fit for **client-side**
frequency control — e.g. replacing the hand-rolled
`lib/data/use-debounced-value.ts`, or throttling the graph/search inputs — a
separate, complementary concern adopted in §10. **`@upstash/ratelimit`** is the
Vercel-ecosystem default (great
sliding-window + analytics) but is coupled to Upstash Redis — no no-Redis mode,
so it fails the "works today" bar. **`@vercel/firewall`** (`checkRateLimit`) is
a clean platform-level *edge* layer, but Vercel-specific, not
self-host-portable — worth adding on Vercel *in addition to*, never instead of,
the portable app-level limiter. **`express-rate-limit`** is Express middleware,
awkward in Next route handlers / server actions.

### 10. TanStack Pacer (client-side debounce/throttle) — adopted

The *client* half of frequency control, complementing §9's server limiting.
`lib/data/use-debounced-value.ts` is now a thin adapter over Pacer's
`useDebouncedValue` (`@tanstack/react-pacer`) — the vendor API stays in that one
file, so the one caller (graph target search) is untouched and a revert is a
one-file change. Pacer also covers throttle / rate-limit / queue for future UI
needs (e.g. throttling the graph search input); add those behind the same
`@/lib/data` adapters rather than importing Pacer directly in components.

---

## Keep hand-rolled (deliberate)

| Surface | Why it stays |
|---|---|
| CSV + vCard import parsers (`lib/import/`) | Deliberately hand-rolled and dependency-free so the raw file is parsed 100% client-side (local-privacy) — no `.vcf`/CSV npm parser is added even if one looks tidier. |
| Graph stack (`sigma`, `graphology`, layout workers) | Already library-based; the custom perf work is product moat. |
| `use-graph-data` SWR/ETag/IDB boot | Coupled to layout + perf beacons; revisit only with §5. |
| Landing decor (`Particles`, `GlassSurface`, `DecryptedText`, …) | Visual identity, no state logic worth outsourcing. |
| `WebcamCapture` | Thin `getUserMedia` wrapper; a library adds surface, not value. |
| Toasts (`sonner`), onboarding (`driver.js`), UI primitives (shadcn/Base UI) | Already libraries. |

---

## Sources

- [TanStack Table](https://tanstack.com/table/latest) · [shadcn data-table](https://ui.shadcn.com/docs/components/radix/data-table)
- [TanStack Query polling guide](https://tanstack.com/query/latest/docs/framework/react/guides/polling)
- [TanStack DB 0.6 announcement](https://tanstack.com/blog/tanstack-db-0.6-app-ready-with-persistence-and-includes) · [Electric + TanStack DB](https://electric-sql.com/blog/2025/07/29/local-first-sync-with-tanstack-db)
- [nuqs](https://nuqs.dev/)
- [TanStack Form comparison](https://tanstack.com/form/latest/docs/comparison) · [RHF vs TanStack Form (LogRocket)](https://blog.logrocket.com/tanstack-form-vs-react-hook-form/)
- [FlashList](https://docs.expo.dev/versions/latest/sdk/flash-list/)
- [react-easy-crop](https://www.npmjs.com/package/react-easy-crop)
- [shadcn Command / cmdk](https://ui.shadcn.com/docs/components/radix/command)
- [rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible) · [@upstash/ratelimit](https://github.com/upstash/ratelimit-js) · [@vercel/firewall rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) · [TanStack Pacer (client-side)](https://tanstack.com/pacer/latest/docs/guides/rate-limiting)
