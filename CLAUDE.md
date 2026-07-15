# CLAUDE.md

These rules apply to every task in this project unless explicitly overridden.
Bias: caution over speed on non-trivial work. Use judgment on trivial tasks.

## Rule 1 — Think Before Coding
State assumptions explicitly. If uncertain, ask rather than guess.
Present multiple interpretations when ambiguity exists.
Push back when a simpler approach exists.
Stop when confused. Name what's unclear.

## Rule 2 — Simplicity First
Minimum code that solves the problem. Nothing speculative.
No features beyond what was asked. No abstractions for single-use code.
Test: would a senior engineer say this is overcomplicated? If yes, simplify.

## Rule 3 — Surgical Changes
Touch only what you must. Clean up only your own mess.
Don't "improve" adjacent code, comments, or formatting.
Don't refactor what isn't broken. Match existing style.

## Rule 4 — Goal-Driven Execution
Define success criteria. Loop until verified.
Don't follow steps. Define success and iterate.
Strong success criteria let you loop independently.

## Rule 5 — Use the model only for judgment calls
Use me for: classification, drafting, summarization, extraction.
Do NOT use me for: routing, retries, deterministic transforms.
If code can answer, code answers.

## Rule 6 — Token budgets are not advisory
Per-task: 4,000 tokens. Per-session: 30,000 tokens.
If approaching budget, summarize and start fresh.
Surface the breach. Do not silently overrun.

## Rule 7 — Surface conflicts, don't average them
If two patterns contradict, pick one (more recent / more tested).
Explain why. Flag the other for cleanup.
Don't blend conflicting patterns.

## Rule 8 — Read before you write
Before adding code, read exports, immediate callers, shared utilities.
"Looks orthogonal" is dangerous. If unsure why code is structured a way, ask.

## Rule 9 — Tests verify intent, not just behavior
Tests must encode WHY behavior matters, not just WHAT it does.
A test that can't fail when business logic changes is wrong.

## Rule 10 — Checkpoint after every significant step
Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back.
If you lose track, stop and restate.

## Rule 11 — Match the codebase's conventions, even if you disagree
Conformance > taste inside the codebase.
If you genuinely think a convention is harmful, surface it. Don't fork silently.

## Rule 12 — Fail loud
"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.

---

## Project: Dhaga (धागा — "thread"; formerly working title NetworkPro)

An AI-native personal CRM: capture contacts anywhere (card/badge scan, voice
notes, web quick-add, browser extension), turn every note into a private
knowledge graph, query it in natural language, act on proactive intelligence.
Open-core (AGPL core + proprietary cloud tier). Privacy-first, local-first.
GitHub: https://github.com/anchit2000/dhaga

**Key documents — read before making product decisions:**
- `docs/BRD.md` — full requirements: MVP scope (M1–M8), roadmap, competitor analysis, cost model, architecture
- `docs/ideas.md` — raw feature ideas backlog
- `docs/SELF_HOSTING.md` — what self-hosting without `packages/ee` means and how to verify it
- `docs/checklist.md` — feature-by-feature build status
- `apps/web/` — Next.js app; the landing page lives at `src/app/page.tsx`

**Brand identity:** warm near-black ground, amber thread glow, Geist Pixel for
display + body, IBM Plex Mono for labels/code. Design tokens live in
`apps/web/src/app/globals.css` (`--color-ink/panel/seam/paper/fog/amber`).

### Decided stack (do not re-litigate without asking)
| Layer | Choice |
|---|---|
| Web app + API | **Next.js (App Router) + TypeScript**, deploys to Vercel or a container |
| Mobile | **React Native + Expo** (iOS + Android, one codebase) — separate app, later milestone |
| Browser extension | Chrome/Edge, shares the web quick-add TS core |
| Cloud DB | **Postgres + pgvector** |
| On-device DB (mobile) | SQLite (op-sqlite) + sqlite-vec — the phone is the source of truth |
| LLM | Claude via Anthropic SDK — Haiku for extraction/parsing, Sonnet for search/drafts, Batch API for nightly jobs |
| Validation/schemas | **Zod** — extraction schemas defined once, shared across app/web/extension/server |

### Architecture principles
1. **Local-first.** Mobile works fully offline; cloud is sync + heavy compute, never a dependency.
2. **Tiered inference.** Free on-device primitive first (OCR, transcription, embeddings) → smallest capable model → Batch API for latency-insensitive jobs → prompt-cache everything cacheable. Never call a bigger model where a smaller one passes evals.
3. **Every AI-derived fact keeps a receipt.** Facts and graph edges store `source_note_id`. Deleting a note tombstones its derived facts.
4. **Structured outputs always.** LLM extraction calls use `output_config.format` with a Zod-derived JSON schema — never parse free-text model output.
5. **Boring storage.** The graph is relational tables (`contacts`, `companies`, `events`, `notes`, `facts`, `edges`, `embeddings`) — no graph DB.

### Planned repo layout (create as milestones need it; update this section as it evolves)
```
apps/web/          Next.js app: marketing, web quick-add, graph browser, API routes
apps/mobile/       Expo app (SDK 57, dev-client) — M0 capture spike built; M1+ pending
apps/extension/    Browser extension (MV3) — built, v1.1
packages/core/     Shared: Zod schemas, extraction prompts, API client, types
packages/ee/       Dhaga Cloud only: multi-tenant RLS, billing, admin, early
                   access — source-available (PolyForm Shield 1.0.0), not
                   AGPL; self-hosting needs none of it, see docs/SELF_HOSTING.md
```

---

## File Organization Rules

### Constants and Enums
- **All constants** (arrays, fixed values, magic numbers) go in `src/utils/constants/`
- **All TypeScript enums** (if used) go in `src/utils/enums.ts`
- Never define constants inline in component files or lib files — import from `@/utils/constants`
- Types (interfaces, type aliases) stay in `src/types/index.ts`; if `types/index.ts` exceeds 150 lines, split into domain files (`src/types/contact.ts`, `src/types/graph.ts`, etc.)

### File Length Rule
- If a file exceeds **150 lines**, convert it into a directory:
  - `src/lib/extraction.ts` → `src/lib/extraction/index.ts` + `src/lib/extraction/schema.ts` + `src/lib/extraction/prompts.ts`
- After splitting, update the repo-layout section above
- The `index.ts` of a directory re-exports everything so import paths don't change
- (A PostToolUse hook warns automatically when this rule is breached)

### No Duplicate Code
- Check `packages/core`, `@/utils/constants`, `@/lib/*`, and `@/components/ui/*` before writing new utilities
- If the same logic appears in 2+ places, extract it immediately — shared logic belongs in `packages/core` if more than one app needs it

---

## SOLID Principles (enforced on every file)

| Principle | Rule |
|---|---|
| **S** Single Responsibility | Each file/class/function has one reason to change. Extraction schema, prompt builder, and API client are separate files. |
| **O** Open/Closed | Extend via interface implementation, not by modifying existing code. |
| **L** Liskov Substitution | Any `LLMClient` implementation must be fully substitutable for any other. |
| **I** Interface Segregation | Don't force classes to implement methods they don't need. |
| **D** Dependency Inversion | Depend on the `LLMClient` interface, not a concrete provider class. |

**LLM gateway pattern (BYO-key / local-model support is a product requirement, not a nice-to-have):**
- `packages/core/llm/types.ts` — `LLMClient` interface (the contract)
- `packages/core/llm/anthropic-client.ts` — `AnthropicLLMClient implements LLMClient`
- `packages/core/llm/prompts/` — prompt builders (pure functions, no LLM dependency)
- `packages/core/llm/index.ts` — `getLLMClient()` factory
- Adding Ollama/BYO-key later = new implementation of `LLMClient`, zero changes to callers

**Search gateway pattern (same shape as the LLM gateway — web search is provider-agnostic too):**
- `packages/core/search/types.ts` — `SearchClient` interface (the contract)
- `packages/core/search/firecrawl-client.ts` — `FirecrawlSearchClient implements SearchClient` (default provider)
- `packages/core/search/index.ts` — `getSearchClient()` factory, keyed off `SEARCH_PROVIDER`
- Adding Brave/SerpAPI/a self-hosted SearXNG instance = new implementation of `SearchClient` + one case in the factory, zero changes to callers

---

## Security & Privacy Rules

### API keys
- `ANTHROPIC_API_KEY` is **server-only** — never prefix it with `NEXT_PUBLIC_`
- All LLM code is **server-only** — never import it from a `"use client"` component
- All AI calls go through Next.js API routes / server actions; clients call our own `/api/*`, never third-party APIs directly
- If you add `"use client"` to a file, immediately check its imports — remove any server-only lib imports

### Privacy (this is the product's moat — treat violations as bugs)
- No silent data collection. Enrichment and cloud AI calls are user-triggered or explicitly opted-in per feature
- Contact data is the *user's* data about *third parties* — deletion must cascade fully (contact → notes → facts → edges → embeddings)
- Never log contact PII, note transcripts, or extraction outputs in plaintext server logs
- Export must always work: the user can leave with all their data at any time

---

## Mandatory Code Rules

### Imports
- **All imports at the top of every file** — no inline imports
- **No wildcard imports** — `import { X, Y } from 'z'`, never `import * as Z from 'z'`
- Order: 1) React/Next.js core, 2) third-party packages, 3) internal `@/` paths, 4) type imports

### TypeScript
- `strict: true` is on — no `any`, no `@ts-ignore`
- All props and function return types are explicitly typed
- Shared types come from `packages/core` (or `@/types` inside an app) — never redefine

### UI / UX
- **Very, very clean.** Generous whitespace, one accent color (amber), restrained borders, no visual noise. When in doubt, remove an element rather than add one. Every screen should look like a professional design studio shipped it.
- Expert-level polish: spacing, typography hierarchy, hover states, loading skeletons, empty states
- Use shadcn/ui primitives — no raw HTML `<button>` or `<input>` outside components
- All interactive elements: loading state (disabled + spinner) while in-flight
- **Mobile-first is mandatory — every feature must work at 375px before desktop polish**
- Grids: `grid grid-cols-1 sm:grid-cols-2` — never multi-column without a breakpoint
- Touch targets ≥ 44×44px; tab bars/chip rows use `overflow-x-auto`; arbitrary pixel widths need responsive fallbacks
- Sidebars/filters collapse to a `Sheet` on mobile; tables wrap in `overflow-x-auto`

### AI Calls
- Extraction/parsing: `claude-haiku-4-5` — structured outputs with Zod-derived schema, never free text
- Search reasoning / follow-up drafts: `claude-sonnet-5` — system prompts must be prompt-cache friendly (stable prefix, volatile content last)
- Nightly/latency-insensitive jobs (enrichment, change detection, digests): Batch API
- Every AI feature is metered per user from day one (free-tier cap: 25 cloud AI actions/month)
- System prompts must include: "If the information is not in the user's notes or graph, say so — do not fabricate"
- Every prompt builder that reasons about recency includes `todayLine()` (`packages/core/llm/prompts/today.ts`) — in the volatile user prompt, never the cached system prompt (see the search gateway/LLM gateway note above on cache-friendliness). Skip it only where there's no temporal judgment to make (e.g. card-scan OCR).

### API Routes
- All `/api/*` routes validate auth before processing
- Rate-limit AI endpoints per user
- Never expose server secrets to the client bundle

---

## Local / E2E testing (dummy load-test user)

For Playwright / manual E2E, a disposable **load-test user** owns the seeded
dummy graph in the Supabase DB that `apps/web/.env.vercel` points at. Same
credentials that `apps/web/scripts/seed-dummy-graph.mjs` defines and prints —
a throwaway test account, never provisioned in production, not a real secret:

- User id: `dummy-loadtest-user`
- Email: `loadtest@dhaga.internal`
- Password: `LoadTest-Dummy-2026!`

Seed/reset the graph with `node --env-file=.env.vercel scripts/seed-dummy-graph.mjs recreate`.

`next dev` auto-loads `.env.local` (local PGlite, no `DATABASE_URL`), **not**
`.env.vercel` — so to reach this user, run a dev server whose env carries
`.env.vercel`'s `DATABASE_URL` (Supabase) with `BETTER_AUTH_URL` pointed at your
local port (e.g. `http://localhost:3010`).
