# Build timeline

Coding on Dhaga started on **2 July 2026** with a single commit, `initial
scoping`. This page is a public, curated summary of what got built when,
derived directly from the project's git history — **444 commits across 22
active days** between 2 and 28 July 2026. The full, unabridged log lives on
GitHub: [github.com/anchit2000/dhaga/commits/main](https://github.com/anchit2000/dhaga/commits/main).

In the spirit of the project's "fail loud, don't overclaim" rule, this is a
**milestone-level** summary, not a commit-by-commit dump: hundreds of the 444
commits were merges, fixes, doc passes, and polish that don't each earn a
line. Every bullet below traces to a real commit subject; if something isn't
here, it either hasn't shipped or didn't rise to milestone level. For where
each feature actually stands today — shipped vs. in progress vs. planned — read
the [roadmap](ROADMAP.md) and the [build checklist](checklist.md).

## Day 1 — scoping, brand, and the shared core (2 Jul)

- Initial scoping; a landing page with a scroll-story product demo, the brand
  system, docs shell, and config.
- Mobile mockups laying out the real app anatomy across every phone screen.
- A build checklist derived from the BRD.
- `packages/core`: the shared Zod schemas, the LLM gateway, and a heuristic
  parser, wired up as npm workspaces.

## Day 2 — the whole web loop, in one day (3 Jul)

The single biggest burst of feature work. In 24 commits, the entire capture →
graph → search → draft loop landed on web:

- Web app shell: auth, a PGlite + Drizzle data layer, and contacts CRUD.
- Quick-add extraction, sessions, notes, and facts-with-receipts, plus AI
  metering from day one.
- Natural-language search, follow-up drafts, export (CSV/vCard/JSON), and the
  "forget this person" cascade.
- Graph browser and contact connections (M5).
- Home dashboard with keep-in-touch reminders and "nearby in your network."
- M6: local embeddings + pgvector hybrid search, query understanding, and
  warm-path finding.
- Email (Resend) with post-event digests and user-triggered web enrichment.
- The browser extension (MV3) and the `/api/capture` endpoint.
- Hosted Postgres via `DATABASE_URL` (the Vercel unlock), plus a vitest +
  in-memory PGlite test suite.
- Pre-meeting briefs and voice notes on web; card-photo scanning in quick-add
  (M1, web vision path).
- The Telegram bot, outbound webhooks, PWA install, and API bearer-token auth.

## Cloud, self-host, auth, and the mobile spike (4–5 Jul)

- The multi-tenant SaaS platform — accounts, RLS, admin, billing (**Dhaga
  Cloud** / `packages/ee`).
- A `docker compose` self-host path aligned with the docs.
- Extension packaged for the Chrome Web Store; graph seeding via CSV import +
  confirm-only name-cluster suggestions.
- Better Auth expanded: social login, passkeys, 2FA, magic link, OTP, and
  phone/username sign-in.
- The **M0 mobile spike**: an Expo app with camera capture and on-device OCR.
- GSAP scroll animations and the Geist Pixel font on the landing page.
- **Proactive intelligence**: relationship decay/strength scoring and
  job-change + news signal detection.
- Every recency-sensitive LLM prompt now gets sent today's date; a glass dock
  (voice/camera/file) for quick-add and mobile capture.

## Hardening, the AGPL gate, and M2 (7–8 Jul)

- Checklist drift corrected against the actual code; Vercel deploy marked done.
- CI now verifies the **AGPL core builds without `packages/ee`** — the
  self-hosting guarantee, enforced.
- The public roadmap doc; a crop-review step added to card scan on both web and
  mobile; regression coverage for warm-path finding and strength scoring.
- **M2 auto event grouping**: geohash + time session clustering (BRD §6.2).

## The audit marathon (11–12 Jul)

Two of the busiest days (34 + 40 commits) were a sustained correctness and
security sweep — a rhythm of *fix, then document the pass*:

- Data-loss and race fixes across the stack: heuristic-parse Unicode/dedup,
  CSV/vCard export on bare-CR fields, `applyExtraction` mid-loop DB failures,
  the `findOrCreateCompany` insert race, and `upsertSubscription` (Stripe
  webhook) TOCTOU.
- Privacy/isolation fixes: `forgetContact` leaving `signals` rows undeleted
  (GDPR erasure), and missing RLS tenant isolation on the `signals` table
  (cross-tenant IDOR).
- First audit passes over `apps/mobile`, the browser extension, and the
  `packages/core` LLM/search gateways.
- Nightly signal detection moved to the Anthropic **Batch API**.
- Graph APIs, a modular search repo, and the SearchPalette-driven graph
  explorer, including virtualized graph navigation.

## Home/graph UX, light mode, and voice engines (13–14 Jul)

- Home reworked into a unified activity feed; dashboard and table workflows
  improved; Vercel Speed Insights + Analytics added.
- A pluggable **OpenAI-compatible LLM client** in core; "sessions" renamed to
  **events** with on-demand network retrieval.
- **Light mode** across the app and marketing site; landing pricing grounded in
  real LLM-call costs; founding tier reframed as annual.
- Voice dictation gained an on-device **Whisper** fallback and a real-time
  streaming Whisper engine.
- EE role hardening: fail loud on `BYPASSRLS` roles, idempotent
  `create-app-role.sql` with `lock_timeout`.

## Rich contacts, the knowledge graph, and docs groundwork (15–17 Jul)

- Colour/emoji/tags on groups with a searchable events table; a first-run
  onboarding walkthrough (driver.js); optimistic UI + branded loaders.
- Note extraction and enrichment moved to **background jobs**; calendar
  integration + daily people suggestions.
- A **rich contact model**: multiple jobs, labeled contact methods, an edit
  flow; graph relationships with confirm-ambiguous-person linking.
- The **full-graph WebGL knowledge graph** with custom entities and caching
  tiers; the bento-grid home dashboard (v1 → v2 with a daily briefing).
- Landing scroll made cheap (SVG filter, textPath, canvas glow); unchanged
  schema DDL skipped on serverless cold starts; `CONTRIBUTING.md` added.

## Library-first refactors and the docs site (20–21 Jul)

- Connection-pool exhaustion fixed; a **SearchIndex gateway** for near-realtime
  in-app search.
- A deliberate **library-first** turn: a pluggable data-fetching gateway on
  **TanStack Query**, and a **DataTable** on TanStack Table + nuqs URL state.
- The **Fumadocs** docs site at `/docs`, themed to the brand, with content
  across seven sections and a TypeDoc-generated `@dhaga/core` API reference.
- The internal security-audit journal removed in favour of a public
  `SECURITY.md` + follow-ups.

## Landing refresh, the blog, and security sweeps (22–23 Jul)

- Tenant connection reuse + hot-path indexes; app-shell and node-ontology
  caching across `/app` navigation.
- A problem-first hero with refreshed mockups; Playwright screenshot tooling; a
  visual README; false "on your phone / offline" privacy claims corrected.
- A pluggable server rate limiter (rate-limiter-flexible) + TanStack Pacer
  client debounce.
- The **engineering + solutions blog** at `/blog` with share/comment/quote
  engagement; per-domain **case-study demo accounts**; the "Using Dhaga" user
  guide with screenshots; blog/docs segregation + an SEO suite.
- Security: postcss XSS patch, calendar OAuth state bound to session (CSRF), a
  13-finding review sweep, and per-page admin authz (defense in depth). Mobile
  failed captures now persist as a FIFO queue.

## The 51-commit day (24 Jul)

The single busiest day in the history — imports, monetization, voice, viral
growth, and multi-image scan all landed:

- **vCard (.vcf) contact import** and **OAuth contact connectors** (Google +
  Outlook) with mobile expo-contacts import.
- The app made **fully usable with no LLM**, plus progressive page streaming —
  the free tier does real work with zero cloud AI.
- Admin subscription controls, per-user AI credits, and a follow-up date
  picker.
- **Voice**: pluggable Moonshine STT + phonetic teaching (web + mobile) and a
  tap-to-fix transcript review that auto-learns.
- **Multi-image card scan**: front + back and leaflet pages fold into one
  contact (web + mobile).
- **Growth**: Network Wrapped, a public graph sandbox, and two-sided referral;
  a unified "AI proposes, code disposes" **confirmations centre**.
- A 10-post "Guides" SEO cluster and 5 "Dhaga vs X" comparison posts.

## Production stability and the E2E suite (25–26 Jul)

- A run of production-stability fixes: pool exhaustion, cross-contact merge,
  graph crash, and header overlap; graceful AI degradation; streaming progress
  for extraction and Ask Dhaga.
- Bare references (e.g. "his son") rendered as renameable placeholders; a
  **Saved page** (Starred + Watching) with star favourites; home reorg with
  metrics + tile sparklines.
- An **ActionForm resilience sweep** wrapping 30 fire-and-forget forms;
  Moonshine-only voice with a silence gate.
- Deep **connection hygiene**: one scoped DB connection per action, no DB
  connection held across the Ask-Dhaga LLM stream, pooler-portable RLS.
- A committed **Playwright E2E suite** covering all `/app` flows; hardened CI
  npm-install retries.

## Merge ops, messaging capture, and the quick-add hub (27–28 Jul)

- Multi-photo card-scan capture UX; inline add-a-person from the Add-relationship
  dialog.
- An import-page onboarding step + LinkedIn export reminders; **merge & bulk
  ops** for contacts plus a companies management page.
- **Inbound messaging capture** — forward contacts/notes to WhatsApp &
  Telegram (CORE, provider-agnostic gateway).
- A **follow-up calendar view** with in-app-bell + email reminders; a global
  nav **quick-add** with manual entry on every capture screen; two-pane Ask
  Dhaga with source receipts on a right rail.
- Mobile fixes: graceful voice fallback when WebGPU is unavailable (iOS
  Safari), a card-scan silent-fail fix, and decluttered mobile nav.

## Light-mode palette, the logo, and AI discoverability (29 Jul)

- **Light mode audited to WCAG AA and repaired.** The light palette itself was
  the bug: secondary text sat at 4.03:1, control borders at 1.28:1, focus rings
  at ~1.4:1, and `/docs` + `/blog` links rendered amber at **1.83:1**. Darkened
  `--brand-fog`/`--brand-ember`/`--brand-seam`, added `--brand-line` for control
  boundaries that clear 3:1, and moved focus rings to ember. Dark mode is
  unchanged — verified by probing computed tokens in both themes.
- **One rule, enforced everywhere:** amber is a *fill*, never light-mode text.
  ~160 `text-amber` call sites became `text-ember`, and every Tailwind `red-*`
  error colour became `text-destructive`. `.dark` now defines
  `--brand-ember: var(--brand-amber)`, so a single declaration decides the
  accent in both themes instead of each call site guessing.
- **The logo is visible again.** `ThreadMark` hard-coded its two endpoint dots
  to `#f3ede2` — the *dark*-mode cream — which is 1.03:1 on the light ground.
  Now `currentColor`, so it inherits correctly at all 11 render sites.
- **Colour is genuinely centralised.** The primary-button gradient moved out of
  four components into `--brand-amber-lift`/`--brand-amber-sink`, and the
  shadcn semantic layer is declared on `:root, .dark` rather than `:root` alone
  — previously a forced-dark subtree (camera capture, photo cropper) inherited
  *light* semantics, leaving focus rings invisible inside the overlay.
- The knowledge graph got a per-theme node/edge palette (dark fills sat at
  1.8–2.7:1 on the light canvas, and the whole edge mesh vanished at 1.28:1).
- **`llms.txt`/`llms-full.txt` are now generated** from `content/**` by
  `npm run generate:llms-txt` rather than hand-maintained — they had gone stale
  within six days, missing 15 guides and 15 user-guide pages. `robots.ts` now
  also excludes `/wrapped/` and `/r/`, and `theme-color` is media-scoped per
  theme instead of pinned to the dark ink.

---

That's four weeks. For what's shipped, in progress, and planned next, see the
[roadmap](ROADMAP.md); for the exhaustive feature list, the
[build checklist](checklist.md).
