# TODOs, recurring follow-ups, and scheduling — implementation tracker

Status: complete
Branch: `codex/todos-recurring-followups`  
Last updated: 2026-08-06

This file is the durable source of truth for the initiative requested on
2026-08-06. Keep it current through implementation, browser verification,
screenshots, and PR handoff so the work survives context compaction.

## Requested outcomes

- [x] Add a general TODO area where a task does not require a person.
- [x] Allow a TODO to optionally reference a company.
- [x] Keep person linkage optional rather than inventing a placeholder contact.
- [x] Add a personalized 404 page with a minimal, cute cloth-shop comic.
- [x] Add polished, branded loading states.
- [x] Animate the illustration/UI while respecting reduced-motion preferences.
- [x] Support recurring follow-ups with calendar-like cadence controls.
- [x] Turn note phrases such as “reach out by Saturday” into dated calendar items.
- [x] Resolve next weekdays/weekends and relative offsets without an LLM.
- [x] Schedule “next weekend” on Saturday, then offer Sunday in Confirmations.
- [x] Let keep-in-touch cadence choose the relevant weekday/day-of-month/month.
- [x] Auto-distribute cadence items when a weekday is not selected.
- [x] Warn when a chosen day exceeds the user’s configured follow-up capacity.
- [x] Fix the production MapLibre worker response policy without a new service.
- [x] Add root `AGENTS.md`/Codex hooks; reuse already-mirrored project skills.
- [x] Update product, checklist, testing, and user-facing docs.
- [x] Capture documentation screenshots in light/dark themes and at 375px.
- [x] Validate local/preview behavior after the completed production baseline.
- [x] Deliver one branch, one pushed PR.

## Acceptance criteria

### General TODOs

- A signed-in user can open the TODO area from app navigation on mobile and
  desktop, create/edit/complete/delete only their own TODOs, and filter active
  versus completed items.
- Title is required. Person and company are both optional. Linking either one
  renders a navigable association without changing ownership.
- A dated TODO appears on `/app/calendar`; an undated TODO remains actionable in
  the TODO list and does not receive a fabricated date.

### Date resolution and note extraction

- A pure, deterministic resolver has clock- and time-zone-controlled tests for
  explicit ISO dates, weekday names, “next Monday”, “this/next weekend”,
  “tomorrow”, and “N days/weeks from now”.
- The note ingestion path uses the resolver before or after structured model
  extraction so calendar placement does not depend on the model doing date
  arithmetic correctly.
- “Next weekend” produces a Saturday date immediately and a confirmation that
  can keep Saturday or move the item to Sunday.

### Recurrence and keep in touch

- Users can create and edit non-recurring, daily, weekly, monthly, and yearly follow-up
  rules with relevant calendar controls.
- Completing an occurrence advances the series exactly once and is safe under
  retries/concurrent submissions.
- Keep-in-touch settings expose cadence-specific scheduling choices; an omitted
  choice uses capacity-aware auto-distribution.
- Explicitly choosing an over-capacity day shows a warning before save without
  silently discarding the user’s choice.

### 404, loading, and quality

- Unknown public and authenticated routes render the branded 404 experience
  with useful recovery actions.
- Route loading states use the established Dhaga tokens, have accessible status
  text, avoid layout shift, and work in both themes.
- Motion is subtle and disabled/reduced under `prefers-reduced-motion`.
- Relevant unit/integration/E2E tests, typecheck, lint, and production build pass
  with no skipped failures.

## Investigation log

- 2026-08-06: Read root `CLAUDE.md`, web/mobile scoped instructions, and the
  complete Claude hook configuration in `.claude/settings.json` before edits.
- 2026-08-06: Production validation reproduced an undated “this weekend”
  follow-up: its hint renders on the contact, but it has no calendar date.
- 2026-08-06: Root cause is the extraction/apply boundary: structured extraction
  carries only `due_hint`, `applyExtraction` leaves `due_date` null, and the
  calendar correctly omits open rows without a date.
- 2026-08-06: Production confirmations have no date-ambiguity type; the existing
  copy also assumes nothing is written before confirmation and must distinguish
  proposed links from already-scheduled date choices.
- 2026-08-06: Production keep-in-touch stores cadence as approximate elapsed
  days only. Settings exposes People/day = 5 and an unused tested
  `spreadAcrossWeek` utility already exists in core.
- 2026-08-06: Both public and authenticated unknown paths render Next's default
  404. The app-wide loading fallback exposes only a generic “Loading page” state.
- 2026-08-06: Generated the project illustration with the built-in image
  generator, then copied only the optimized WebP asset into the repository.

## Evidence and screenshots

- Production browser baseline is complete: undated note follow-up, default 404,
  legacy keep-in-touch controls, and Map failure were reproduced without writes.
- Chrome/CDP isolated the Map failure to the worker's mismatched COEP response;
  owner payload, worker bytes, and style response were otherwise healthy.
- Post-merge web serial suite: 222 files / 1,248 tests passed. Core: 173/173.
  Mobile: 75/75. Codex hooks: 10/10. Focused final SEO: 5/5.
- Web/core/mobile/EE typechecks pass. EE: 24 pass and 40 live-RLS cases skip
  without a disposable `DATABASE_URL`; its remaining 7 tests pass, 1 skips.
- Web lint exits 0 with pre-existing vendored warnings. Mobile lint is blocked by
  the repository's missing `eslint-config-expo/flat`; mobile tests/typecheck pass.
- The default Turbopack production build reproducibly stalls during optimization.
  `next build --webpack` passes all 281 static pages after removing broad core
  imports from the browser graph; only known auth-env/rate-limiter warnings remain.
- The approved local Playwright runner completed nine authenticated/public flows
  with zero unexpected page or console errors. It also asserted Map worker COEP,
  live canvas rendering, weekend confirmation, Calendar placement, and mobile UI.
- Nine optimized WebPs document light desktop, dark desktop loading, and 375px
  light/dark screens; every asset is embedded once in the relevant public guide.

## Public/app shell quality audit (15 checks)

- [x] 1. View source: nine production-built shells return meaningful server HTML.
- [x] 2. Vite runtime: source audit finds none; the app is Next.js.
- [x] 3. Page titles: public/auth shells have distinct metadata.
- [x] 4. Meta descriptions: complete for public/auth shells.
- [x] 5. `og:image`: file-based image plus shell metadata.
- [x] 6. Structured data: Organization, WebSite, and blog Article JSON-LD.
- [x] 7. Multiple H1s: nine rendered public/auth shells each have exactly one.
- [x] 8. Missing H1s: nine rendered public/auth shells each have exactly one.
- [x] 9. Canonical: public/auth shells use route-specific canonicals.
- [x] 10. AI robots: explicit public allow; `/app` and `/api` stay private.
- [x] 11. Language: root HTML declares `lang="en"`.
- [x] 12. Alt text: source test and nine rendered shells find no missing `alt`.
- [x] 13. Source maps: production browser source maps are not enabled.
- [x] 14. Console errors: nine-flow local QA reports zero unexpected errors.
- [x] 15. JS bundle: client runtime imports no longer use the server-heavy core
       barrel. Emitted route graphs gzip to 464 KB (Tasks), 461 KB (Map), and
       538 KB (Calendar); the largest individual chunk is 131 KB gzip.
- Asset decision: keep the 65,318-byte 1200×800 WebP unoptimized; it is already
  compact and avoids billable Vercel image transformations for a fixed asset.
- Map root cause: Chrome blocked the 200 MapLibre worker under `/app` COEP;
  matching `credentialless` worker headers now have a regression test.

## Decisions made from existing product behavior

- General TODOs reuse follow-ups with nullable person and optional company links.
- Recurrence advances one row atomically; dismissal ends the series.
- The People/day suggestion setting is the keep-in-touch scheduling capacity.
  Explicit over-capacity choices remain allowed but return a visible warning.
- Auto-assignment uses the existing deterministic `spreadAcrossWeek` policy.
- Manual tasks survive association deletion; note-derived items retain provenance.
