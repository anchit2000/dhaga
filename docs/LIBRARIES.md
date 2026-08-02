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

- `components/app/contact/ExtractionStatus/useExtractionStream/` — reads a
  single NDJSON progress stream from the extraction worker (no poll loop). This
  replaced the former 2s `setTimeout` poller + whole-page `router.refresh()`;
  because it consumes a streamed response rather than re-fetching on an interval,
  TanStack Query's `refetchInterval` does not apply here. Its one remaining loop
  is `use-fallback-poll.ts`, a deliberately slow, bounded reconcile for the
  claim-lost case only.
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

**Status — row selection + bulk actions (built).** The "future bulk actions"
above are now wired. `DataTable` gained optional row selection — a per-row
`Checkbox` plus a select-all-on-page header checkbox, with the selection
preserved across pagination — surfaced through a shared `BulkActionBar`
(`components/app/table/`). Two new primitives back it: `Checkbox` and
`RadioGroup` (`components/ui/`). This powers **merge and bulk operations** on
People (`/app/people`) and the new Companies page (`/app/companies`); the
per-field merge resolver reuses `computeScalarConflicts` from `@dhaga/core`.

### 3. nuqs (URL state)

**Replaces:** the manual `URLSearchParams` + `router.replace` wiring in
`DataTable`'s server mode (`navigate()`), and any future filter/tab/page state
that belongs in the URL. Type-safe parsers, App Router native, 5.7 kB.

### 12. FullCalendar v6 (follow-up calendar) — adopted 2026-07-27

**Powers:** the `/app/calendar` follow-up view (month + agenda) with
drag-to-reschedule.

`@fullcalendar/react` + `@fullcalendar/core` + `@fullcalendar/daygrid` +
`@fullcalendar/list` + `@fullcalendar/interaction` (all v6.1.x). Don't hand-roll
month grids, keyboard nav, or touch drag math — FullCalendar is the mature,
framework-agnostic calendar and its `interaction` plugin gives pointer + touch
drag-to-reschedule out of the box. Follow-ups are all-day, single-date items, so
we use the **dayGrid** (month) and **list** (agenda) views only — no time-grid.
Themed to the amber/seam/panel design tokens via `--fc-*` CSS-variable overrides
(no vendored FullCalendar theme CSS), the same "library themed to our tokens, no
second design language" approach as react-day-picker (§11). react-big-calendar
was not chosen — it needs moment/date-fns adapters and its Bootstrap-derived DOM
is harder to bend to the bespoke look than FullCalendar's CSS-variable surface.

### 13. react-markdown (Ask-Dhaga answer rendering) — adopted 2026-07-28

**Renders:** the streamed Ask-Dhaga answer (`SearchPalette/AskPanel/`).

The Sonnet answer stage emits Markdown (bold names, bullet lists, links); it was
being dropped into a `whitespace-pre-wrap` `<p>`, so the raw `**`/`-` syntax
showed literally. `react-markdown` v9 (+ the already-present `remark-gfm` v4)
renders it as React elements — no `dangerouslySetInnerHTML`, and its default URL
sanitiser strips dangerous link protocols, which matters for model-generated
text. Wrapped in `AskPanel/AnswerMarkdown.tsx` with a component map themed to the
amber/paper/seam tokens (no vendored stylesheet, same "library themed to our
tokens" approach as the pickers above). Streaming-safe: it re-parses the growing
string each delta and a half-written token renders as text until it closes. Not
`marked`/`markdown-to-jsx` — react-markdown is the maintained standard and its
no-raw-HTML default is the safer posture for untrusted model output.

### 14. lucide-animated / pqoqubbw-icons (animated icons) — vendored 2026-07-29

**Provides:** hover/imperatively-triggered animated versions of the lucide
glyphs we already use, at a handful of deliberate moments.

[pqoqubbw/icons](https://github.com/pqoqubbw/icons) (464 icons, **MIT**) is
distributed as a **shadcn registry, not an npm package** — `npx shadcn add
https://lucide-animated.com/r/<name>.json` copies source into the repo. So this
is a **vendoring**, not a dependency: the files live in
`components/ui/animated-icons/` with the MIT notice in each header, and they
ride our existing `motion` dep (already used by `ui/dock/Dock.tsx`). **Adding an
icon adds zero npm packages** — pull the source, add the header, re-export it
from `animated-icons/index.ts`.

**We add the accessibility the library omits.** Upstream ships *no*
`prefers-reduced-motion` handling at all, and these icons animate `pathLength`
and `opacity` from 0 — an unguarded one can render as a half-drawn path.
`animated-icons/use-animated-icon.ts` holds the single guard: `useReducedMotion()`
(motion's own primitive) gates the *trigger* only, never the markup, so there is
no hydration branch and the icon stays in its fully-drawn `normal` variant.
Any new icon must go through that hook. Vendored files also differ from upstream
in three deliberate ways — React 19 ref-as-prop instead of `forwardRef` (this
repo uses `forwardRef` nowhere), a `<span>` wrapper instead of `<div>` (a div is
invalid inside a `<button>`), and lucide's default size/`aria-hidden` so they
drop into existing call sites without layout shift.

**Where to use it:** marquee moments only, on a client component, driven from
the wrapping button's ref so the whole target triggers the animation rather than
the 14px glyph. Currently five sites — `contact/SaveButton`,
`contact/ReprocessButton`, and the three merge triggers
(`CompanyDuplicatesList`, `CompaniesTable`, `PeopleBulkActions`).

**Where NOT to use it:**

- **Table rows / repeated list rows** (e.g. `CompanyRowActions`) — dozens of
  icons animating at once is visual noise and a per-row `motion` runtime cost.
- **The 54 `Loader2` spinner sites** — matching today's behaviour would need
  ref-driven wrappers at 44 call sites for a visually identical spinner.
- **Blanket `X`/`Check` swaps.** Restraint is the point; if every icon moves,
  none of them read as deliberate.
- **Server components.** These are `"use client"`. Never convert a server
  component to a client component just to animate an icon — skip the site.
- **`apps/mobile`.** It uses `@expo/vector-icons`; `motion/react` is DOM-only.

### 15. mapcn + `maplibre-gl` (map view) — adopted 2026-07-29

**Powers:** `/app/map` — contacts' cities as a clustered point map.

`maplibre-gl` v6 (BSD-3) is the only real npm dependency added. **mapcn** (MIT —
[mapcn.vercel.app](https://mapcn.vercel.app), `AnmolSaini16/mapcn`) is *not* an
npm package: it is a shadcn-style registry, so `npx shadcn@latest add @mapcn/map`
would install `maplibre-gl` and drop a component into `components/ui/`. Our
`components.json` has an empty `registries` map, so the `@mapcn` shorthand does
not resolve; the registry item (`https://mapcn.vercel.app/r/map.json`) was
fetched directly and vendored by hand into `components/ui/map/` — no
`components.json` change, and nothing else in the tree touched.

**Vendored trimmed, not verbatim,** for reasons a future update should keep:

1. **maplibre-gl v6 removed the default export.** Upstream's
   `import MapLibreGL from "maplibre-gl"` (and `MapLibreGL.StyleSpecification`)
   does not compile against v6. Named imports here.
2. **The CARTO default had to be designed out** (below).
3. Markers, popups, tooltips, routes, arcs and GeoJSON layers — ~1,700 of the
   registry item's 2,200 lines — are unused. Re-add from the registry item if a
   use appears; the file-length rule wants a directory of small files anyway.
4. Fixes for our constraints: 44px control buttons, a transparent 22px-radius
   hit layer so a point is a 44px touch target, and a cluster fontstack that
   actually exists on our basemap (upstream's "Open Sans Semibold" 404s on
   OpenFreeMap's glyph endpoint, which silently leaves every cluster unlabelled).

**The worker has to be self-hosted — v6 cannot find its own.** maplibre-gl v6
split the worker out of the main bundle into a sibling `maplibre-gl-worker.mjs`
and locates it at runtime with `new URL('./maplibre-gl-worker.mjs',
import.meta.url)`. A bundler cannot see through that, so once Next inlines the
library into an app chunk the URL points at `_next/static/chunks/`, where no
such file was ever emitted; Next and Vercel both answer the miss with the HTML
shell, the browser refuses a module worker served as `text/html`, and the map
sits on its loading veil forever with nothing in the UI to explain why. (v5
inlined the worker as a Blob, which is why this is new in v6 and why no amount
of mapcn config mentions it.) The fix is the vendor's own knob:
`scripts/copy-maplibre-worker.mjs` copies the worker — **and the
`maplibre-gl-shared.mjs` it imports as a sibling** — into `public/maplibre/` on
`dev` and `build` (not `postinstall`: the Dockerfile installs from the
workspace manifests before copying the source tree), and `Map.tsx` calls
`setWorkerUrl()` with
`MAPLIBRE_WORKER_URL` at module scope, before any map exists. The copied files
are gitignored build output. Keep the constant and the script's output path in
step, and keep the URL **same-origin**: a cross-origin one makes MapLibre
re-wrap the worker in a blob and puts a CDN in the request path of a page whose
whole point is that contact data stays with us.

**Basemap: OpenFreeMap, never CARTO — do not "fix" this back.** mapcn defaults
to CARTO's Positron/Dark-Matter tiles, and mapcn's own README states that
commercial use of them requires a CARTO Enterprise licence. Dhaga is a
commercial product, so shipping the default would be a licence breach.
[OpenFreeMap](https://openfreemap.org) serves OpenStreetMap-derived tiles with
no API key, no rate limit and no commercial restriction, and mapcn's docs
demonstrate exactly this swap via the `styles` prop. Two guards make the
default unreachable rather than merely overridden: the vendored `Map` keeps
**no default style at all** (`styles` is a required prop), and the URLs live in
`utils/constants/map.ts` with the reasoning attached.

**Attribution is a legal requirement, not polish.** Both the tiles and the
geocoding that places the pins (Nominatim — see `lib/db/ddl/geocode.ts`) are
ODbL OpenStreetMap data. OpenFreeMap's style JSON carries **no `attribution`
field on its sources**, so MapLibre's AttributionControl would otherwise render
an empty bar: the credit is passed explicitly as `customAttribution`, with
`compact: false` so it stays visible instead of hiding behind an "i" toggle,
and `components/ui/map/map.css` re-skins that bar to stay legible in both
themes.

Not react-map-gl (heavier, Mapbox-shaped) and not Leaflet (no vector tiles, no
GPU clustering): mapcn is the shadcn-native option, and vendoring means we own
the source the same way we own every other `components/ui` primitive.

### 16. mcp-handler + @modelcontextprotocol/server (MCP server) — adopted 2026-08-02

**Powers:** `/api/mcp` — the Model Context Protocol endpoint an external AI
client (claude.ai, Claude Desktop/Code, ChatGPT, Cursor) connects to in order to
read and additively write the user's own graph.

**Why not hand-roll it.** MCP looks like JSON-RPC over HTTP and isn't just that:
the client negotiates protocol version, discovers the tool list with their JSON
schemas and descriptions, and may hold a session across requests. Writing that
by hand would mean owning transport, session handling and capability
negotiation — and re-owning them every time the spec moves — for zero product
value. `mcp-handler` (Vercel's adapter, the `create-mcp-route` package) turns a
tool-registration function into Next.js route handlers;
`@modelcontextprotocol/server` is the official SDK whose `McpServer` those tools
register on. Between them the app writes only `server.registerTool(name, {…},
handler)` and an auth verifier.

**What it replaced/avoided.** Nothing was replaced — there was no MCP surface
before. What it *avoided* is a second bespoke API dialect: `/api/mcp` reuses the
existing repo layer (`lib/repo/*`), the existing `withUserDb` request scope, and
the existing better-auth credentials, so the MCP tools are a thin registration
file (`lib/mcp/`) rather than a parallel stack. `withMcpAuth` also supplies the
RFC 9728 `WWW-Authenticate` challenge and the `protectedResourceHandler` for
`/.well-known/oauth-protected-resource`, which would otherwise be hand-written
spec plumbing.

**Gotchas worth recording:**

1. **Major versions are coupled.** `mcp-handler` v2 requires MCP SDK **v2** —
   the package named `@modelcontextprotocol/server`, which takes **Zod 4**
   schemas. `mcp-handler` 1.x pairs with the *older* `@modelcontextprotocol/sdk`
   1.x. Mixing them (v2 handler + `sdk` 1.x, or v1 handler + `server` v2) type-
   errors at the `McpServer` boundary rather than failing informatively.
2. **better-auth's server-side `mcp` plugin is only exported from the
   `better-auth/plugins` root.** `better-auth/plugins/mcp` resolves to the
   *client* half, so importing the subpath on the server is a **TS2307**. That
   is the same shape as `oneTap`, and it's why `lib/auth/config/plugins.ts`
   imports both from the root with a comment saying so — a future "tidy up the
   imports" pass would otherwise reintroduce it.
3. **The OAuth issuer comes from `BETTER_AUTH_URL`.** The `mcp` plugin derives
   its authorization-server metadata from it, and our
   `/.well-known/oauth-authorization-server` document must name the same issuer,
   or spec-compliant clients reject tokens we issued ourselves.

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

### 8. Searchable combobox — Base UI `Combobox` (adopted 2026-07-24); cmdk still open for the palette

Two related but distinct needs here:

- **Entity-reference dropdowns (adopted).** The "add to group" control, the
  contact-form company field, and the relationship/warm-path pickers were bare
  `<input>`s with a hand-rolled absolutely-positioned `<ul>`. These now use a
  shared `EntityCombobox` (`components/app/EntityCombobox.tsx`) built on the
  `components/ui/combobox.tsx` primitive, which wraps **Base UI's native
  `Combobox`** (`@base-ui/react/combobox`). Base UI is already the repo's
  primitive stack (Input, Menu/DropdownMenu, Select, Dialog all wrap it), so its
  Combobox gives portal/positioning/keyboard/a11y that matches the rest of the
  UI **without** pulling in a second primitive stack — cmdk depends on Radix
  internals, so adopting it here would blend Radix into an all-Base-UI codebase
  (Rule 7/Rule 11). Server-driven results plug in via `filter={null}` + the
  shared `useTargetSearch` debounce hook (§10). Migrating the remaining
  hand-rolled pickers (`AttachTargetSearch`, `relationships/*`) to it is a
  low-risk follow-up.
- **Command palette (still open).** The shadcn `Command` wrapper around **cmdk**
  (Linear/Raycast palettes) would replace SearchPalette's hand-rolled keyboard
  handling. SearchPalette has custom modes (search vs. metered Ask, dictation,
  weight tuner) that don't map 1:1, and it would introduce the Radix stack — so
  re-evaluate cmdk vs. Base UI Combobox when SearchPalette next grows; medium
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

### 11. Date picker — `react-day-picker` (adopted 2026-07-24)

The follow-up "when" field and the admin subscription-expiry field both need a
calendar date picker. Base UI (the repo's primitive stack) ships a `Popover`
but **no** calendar/date-picker primitive, so a calendar library is required —
don't hand-roll month grids, keyboard nav, and date math.

- **`react-day-picker` v10** is headless/className-driven and React 19
  compatible. It supplies only the calendar; we anchor it in our own
  `components/ui/popover.tsx` (a thin wrapper over **Base UI's** `Popover`,
  `@base-ui/react/popover`, styled like `combobox.tsx`/`dropdown-menu.tsx`) so
  the floating panel keeps the same portal/positioning/keyboard/a11y as the rest
  of the UI — the same "headless lib themed to Base UI, no second primitive
  stack" reasoning as the Combobox (§8, Rule 7/Rule 11).
- Themed to the amber/seam/panel palette via the `classNames` prop **only** — no
  `react-day-picker/style.css` global import — so `components/ui/date-picker.tsx`
  stays self-contained and matches the repo's token approach. `date-fns` (which
  arrived transitively here) is now a **direct** dependency — the reminders repo
  (`lib/repo/reminders/`) uses it for the calendar's due-date math and relative
  due labels (`isBefore`/`isToday`/`startOfDay`), so it's declared explicitly
  rather than relied on transitively.
- `DatePicker` supports plain server-action `<form>`s: when given a `name` it
  also emits a hidden ISO `<input>`, so the admin expiry form submits the chosen
  date without client wiring. **Used by:** follow-up due date + admin
  subscription expiry.

---

## Keep hand-rolled (deliberate)

| Surface | Why it stays |
|---|---|
| CSV + vCard import parsers (`lib/import/`) | Deliberately hand-rolled and dependency-free so the raw file is parsed 100% client-side (local-privacy) — no `.vcf`/CSV npm parser is added even if one looks tidier. |
| Contacts OAuth connectors (`lib/import/providers/`) | Direct `fetch` to People API / Graph behind a `ContactsProvider` gateway (mirrors the LLMClient/SearchClient pattern) — no `googleapis`/`@microsoft/graph` SDK; the two REST calls we make aren't worth the bundle/transitive surface. Adding a provider = one file + one factory case. |
| Mobile device contacts (`expo-contacts`, SDK 57 **legacy** entry) | Adopted Expo module (like `expo-camera`). Use `expo-contacts/legacy` — SDK 57's new default export is an async class-based API; the legacy plain-object `getContactsAsync` is what the pure device→ContactProfile mapper needs. |
| Graph stack (`sigma`, `graphology`, layout workers) | Already library-based; the custom perf work is product moat. |
| `use-graph-data` SWR/ETag/IDB boot | Coupled to layout + perf beacons; revisit only with §5. |
| Landing interactions (`DecryptedText`, `TiltCard`, `SpotlightCard`) | Lightweight visual identity, no state logic worth outsourcing. The retired WebGL particle/cursor effects were removed rather than kept as decorative bundle cost. |
| `WebcamCapture` | Thin `getUserMedia` wrapper; a library adds surface, not value. |
| Timezone maths (`apps/web/src/lib/time/zone.ts`) | **`Intl` only — no `date-fns-tz`, and don't add it.** The zone-aware work we need is "which calendar day / which local hour is this instant for this user", which `Intl.DateTimeFormat.formatToParts` answers directly against the runtime's own tzdata (Node 22 also gives us `Intl.supportedValuesOf("timeZone")` for the ~418-entry Settings picker, so the zone list needs no package either). A tz library would buy formatting sugar and cost a dependency plus its own bundled tzdata to keep current. It also would not be portable: the same maths belongs in `packages/core` eventually, and core is deliberately dependency-free and has to run on React Native's Hermes — where `supportedValuesOf` is unreliable, which is exactly why `zone.ts` sits in `apps/web` for now. `date-fns` (already adopted) stays for zone-free date arithmetic. |
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
- [react-day-picker](https://daypicker.dev/) · [Base UI Popover](https://base-ui.com/react/components/popover)
- [FullCalendar React](https://fullcalendar.io/docs/react) · [FullCalendar CSS variables](https://fullcalendar.io/docs/css-customization)
- [shadcn Command / cmdk](https://ui.shadcn.com/docs/components/radix/command)
- [pqoqubbw/icons](https://github.com/pqoqubbw/icons) · [lucide-animated registry](https://lucide-animated.com) · [motion `useReducedMotion`](https://motion.dev/docs/react-reduced-motion)
- [Model Context Protocol spec](https://modelcontextprotocol.io/specification) · [mcp-handler](https://www.npmjs.com/package/mcp-handler) · [better-auth MCP plugin](https://www.better-auth.com/docs/plugins/mcp)
- [rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible) · [@upstash/ratelimit](https://github.com/upstash/ratelimit-js) · [@vercel/firewall rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) · [TanStack Pacer (client-side)](https://tanstack.com/pacer/latest/docs/guides/rate-limiting)
