# Dhaga — Build Checklist

Derived from [BRD.md](BRD.md). Every feature, big and small. Items get checked
(`[x]`) only when the code is written, verified (lint + build + manual run), and
pushed. Partial work stays unchecked with a note.

Legend: **(M#)** = BRD MVP feature · **(v1.x)** = BRD roadmap phase

---

## 0. Foundation

- [x] Git repo + GitHub (`anchit2000/dhaga`), AGPL-3.0 LICENSE, README
- [x] CLAUDE.md project rules (stack, SOLID, security, file organization)
- [x] Next.js app scaffold (`apps/web`) — App Router, TS strict, Tailwind v4
- [x] Design tokens centralised (`globals.css` @theme: ink/panel/seam/paper/fog/amber)
- [x] Landing page (hero, scrollytelling feature story, pricing, FAQ, OSS section)
- [x] npm workspaces (`apps/*`, `packages/*`) so `packages/core` is shareable
- [x] `apps/web/.env.example` documenting every env var
- [x] CI (typecheck + lint + tests + build on push)
- [x] Test suite (vitest, in-memory PGlite): heuristic parser, export formats, receipts cascade
- [x] Fix Dependabot alert (postcss <8.5.10 via next — npm override to ^8.5.16)
- [x] Deploy to Vercel (landing + app)

## 1. Shared core — `packages/core`

- [x] Zod contact schema (name, title, company, emails[], phones[], links, location)
- [x] Zod extraction schema (facts, relationships, follow_ups, tags) per BRD §6.3
- [x] `LLMClient` interface (Dependency-Inversion contract)
- [x] `AnthropicLLMClient` — structured outputs via Zod-derived JSON schema
- [x] Prompt builders (pure functions): contact parse, note extraction
- [x] Prompt builders: search answer, follow-up draft
- [x] Prompt builder: search query understanding (structured filters stage)
- [x] `getLLMClient()` factory (env-driven; Ollama/BYO-key = future implementations)
- [x] Heuristic (no-LLM) contact parser fallback — email/phone/URL regex + name lines
- [x] Shared API types (request/response contracts used by web now, mobile later) — `packages/core/src/api/{capture,contacts,export,card-image,access-requests,jobs}.ts`; each route `satisfies` its contract (2026-07-07); `auth/[...all]`, `stripe/webhook`, and `telegram` intentionally left untyped (better-auth's own catch-all, a Stripe-shaped webhook receiver, and an internal bot webhook — none are a shared web/mobile contract surface), not pushed

## 2. Web app shell (v1.1 surface, built first)

- [ ] Auth: real accounts (better-auth email/password), signed httpOnly session cookie — typecheck/lint/build/test all pass; manual browser click-through + push still pending
- [x] Every `/app` page + server action validates the session (guard helpers)
- [x] App layout: nav (People / Sessions / Search / Quick-add), mobile-first at 375px
- [x] Empty states + error states; submit buttons have loading spinners
- [x] Loading skeletons on data-heavy screens (route `loading.tsx` files)
- [x] Dark warm theme reused from landing tokens
- [x] Home dashboard: due reach-outs + open follow-ups across the graph

## 3. Data layer (BRD §7.4 — boring storage)

- [x] PGlite (embedded Postgres) + Drizzle; hosted Postgres = driver swap
- [x] Hosted Postgres support: `DATABASE_URL` → node-postgres (unlocks Vercel)
- [x] `contacts` table
- [x] `companies` table
- [x] `sessions` + `session_contacts` tables (M2)
- [x] `notes` table (kind: voice|text|capture_source, body)
- [x] `facts` table (type, text, confidence, `source_note_id`, `deleted_at`)
- [x] `edges` table (src/dst typed, predicate, `source_note_id`)
- [x] `embeddings` table (pgvector, 384-dim, receipts via owner_type/owner_id)
- [x] `follow_ups` table
- [x] `ai_actions` metering table (day one requirement)
- [x] Deletion cascade: contact → notes → facts → edges → embeddings ("forget this person") — `forgetContact` already did this correctly (`repo/contacts/mutations.ts`)
- [x] Note deletion tombstones derived facts/edges (receipts invariant) — embeddings cleanup moved into `deleteNote` itself (2026-07-07, was only in the action layer, so any other caller skipped it); `graph-receipts.test.ts` now asserts embeddings are gone, not pushed

## 4. Capture — web quick-add (v1.1, M1-equivalent for web)

- [x] Paste email signature / free text → extracted contact (LLM, heuristic fallback)
- [x] Card photo scan (M1 web path): phone camera/upload → vision parse → review → receipt
- [x] Card photos stored as visual receipts (user's own DB — local or hosted), shown on the contact page
- [x] Settings page: per-user "store card photos" toggle + purge-all button
- [x] Photo deletion cascades: gone with its receipt note, gone with "forget this person"
- [x] Edit-before-save review form (M1 acceptance: user confirms fields)
- [x] Assign capture to a session (create/pick "Web Summit 2026")
- [x] Attach source text as first note (receipt for extracted fields)
- [x] Manual add-contact form (no extraction path)
- [x] People list with filter + contact detail page
- [x] Company auto-link: extracted company name → find-or-create `companies` row
- [x] User-triggered enrichment: web search → cited enrichment note → receipted facts
- [x] LinkedIn Connections CSV import — user's own LinkedIn data export → bulk contacts, ToS-safe (BRD §6.7) (v1.1); `lib/import/linkedin.ts`, wired into `/app/import`, LinkedIn header format covered by `csv-import.test.ts`/`import-repo.test.ts`
- [x] Waitlist signups get a confirmation email (Resend)

## 5. Sessions / auto-grouping (M2)

- [x] Sessions list + session page (contacts met there)
- [x] Create sessions (from Sessions page and inline in quick-add)
- [x] Rename/merge sessions
- [x] Web: active-session default (a session started today is preselected in quick-add)
- [x] Mobile: time + geohash clustering per BRD §6.2 — `packages/core/src/geo/geohash.ts` + `apps/web/src/lib/repo/session-clustering.ts` (geohash-6, 4h window, "Name this event?" prompt on new cluster); typecheck/lint/build/tests all pass (`a346516`), not pushed; needs on-device verification (no EAS/device access here)

## 6. Notes & entity extraction (M3, M4)

- [x] Text notes on a contact (add, list, delete)
- [x] Extraction: note → facts/relationships/follow-ups/tags (Haiku, structured output)
- [x] Facts render on contact page with receipt ("from note, {date}")
- [x] User can edit/delete a fact inline (M4 acceptance)
- [x] Deleting a note tombstones its derived facts/edges
- [x] Voice notes on web (browser SpeechRecognition → transcript → extraction)
- [ ] Voice notes on mobile (whisper.cpp / Apple Speech — mobile milestone) — built via `expo-speech-recognition` (wraps iOS `SFSpeechRecognizer`/Android `SpeechRecognizer`, forced on-device, no audio/transcript leaves the phone); tap mic → live interim transcript fills the same text-review box typed input uses (`e64b336`). Typecheck/lint pass; **package has no published SDK-57 tag yet** (installed cleanly, types check, but native linking in an EAS/dev-client build is unverified) — needs a real device build before this can be checked off, not pushed

## 7. Knowledge graph v0 (M5)

- [x] Relationship edges written from extraction (`works_at`, `knows`, `used_to_work_at`, …)
- [x] Contact page: same-company + same-session + edge connections render
- [x] Graph browser page (React Flow: people/companies, typed edges, ring layout)
- [x] Tag ontology v0 (tags from extraction, filter chips on People)

## 8. Natural-language search (M6)

- [x] Keyword + structured search (SQL ILIKE over contacts/notes/facts) — free path
- [x] Query understanding: LLM → structured filters + semantic residual (Ask AI stage 1)
- [x] Embeddings + pgvector similarity (bge-small via transformers.js — local, $0)
- [x] "Ask AI" answer over retrieved candidates with receipts (Sonnet, explicit click)
- [x] Acceptance: seeded test set — correct contact in top 3 (vitest, keyword path; semantic covered by the standalone E2E check)

## 9. AI follow-up drafts (M7)

- [x] One-tap draft using notes + session context + facts (Sonnet, cache-friendly prompt)
- [ ] Draft references ≥1 note-derived fact (acceptance — verify with a live API key)
- [x] Edit + copy-to-clipboard flow

## 10. Metering, cost control (BRD §8.2–8.3)

- [x] Every AI call logged to `ai_actions` (feature, model, tokens in/out)
- [x] Free-tier cap enforced (25/month, `DHAGA_AI_MONTHLY_CAP` override) with clear UI message
- [x] Prompt caching markers on stable system prompts (engages once prompts exceed the model's cacheable minimum)
- [ ] Batch API for nightly jobs — the first nightly job now exists (`lib/jobs/detect-signals.ts`, §14) but calls Haiku synchronously per watched contact rather than through the Batch API; volume is naturally bounded by the per-plan watchlist cap today, so this is a follow-up optimization, not blocking

## 11. Privacy & export (M8, BRD §7.5)

- [x] "Forget this person" — full cascade delete with confirmation
- [x] Export: contacts CSV
- [x] Export: vCard
- [x] Export: full JSON dump (contacts+sessions+notes+facts+edges)
- [x] No contact PII / transcripts / extraction output in server logs
- [x] Enrichment & cloud AI strictly user-triggered (no background calls)

## 12. Mobile app — `apps/mobile` (BRD MVP platform; separate milestone)

- [x] PWA: installable web app (manifest, standalone display, brand icons) — the interim mobile surface
- [ ] Per-user API keys (better-auth `apiKey` plugin) for non-browser clients — replaces `DHAGA_API_TOKEN`; code confirmed fully wired end-to-end (2026-07-07 audit): `apiKey` plugin, settings UI, `/api/capture` auth fallback all connected, `DHAGA_API_TOKEN` no longer referenced anywhere in code. Only remaining bar is a human clicking through the settings UI in a browser
- [x] `/api/capture` accepts card images (base64) — ready for the Expo app to call

- [ ] M0 spike: Expo app, camera → Vision/ML Kit OCR → Haiku parse → contact saved — built 2026-07-04 (`apps/mobile`: Expo SDK 57, dev-client, `expo-text-extractor` on-device OCR primary + server photo-scan fallback, `x-api-key` auth); typecheck green; **needs on-device verification on Android + iPhone** (see `apps/mobile/README.md`), not pushed
- [ ] M1 card scan: edit-before-save, ≥90% accuracy on clean cards, <5s
- [ ] M2 auto event grouping (time + geohash clustering, name-once prompt)
- [ ] M3 voice notes: whisper.cpp / Apple Speech on-device transcription — built via `expo-speech-recognition` (§6 has details); typecheck/lint pass, needs a real device build to confirm native linking on SDK 57, not pushed
- [ ] M8 local-first SQLite (op-sqlite) + sqlite-vec; full offline
- [ ] Sync engine (field-level LWW or PowerSync/ElectricSQL — decide per BRD §11)
- [ ] E2E-encrypted backup/sync
- [ ] EAS builds: .aab (Play) + .ipa (App Store); store listings

## 13. Browser extension (v1.1)

- [x] Chrome/Edge extension (MV3): popup captures page selection → `/api/capture`
- [x] One-click capture from any page (activeTab on explicit click only, page URL as receipt)
- [x] `/api/capture` REST endpoint (session-gated; shared by extension + future mobile share)
- [x] "Save this article to {contact}": attach mode in the popup + contact search API
- [ ] Web Store packaging/listing (privacy policy page now live at `/privacy`) — further along than it looks: build/zip pipeline exists (`apps/extension/build.mjs`), a pre-built `.zip` and `STORE_LISTING.md` with listing copy are ready; only remaining blockers are a reviewer demo account + the $5 Chrome dev registration fee (both manual/external, not code)

## 14. Proactive intelligence (v1.2)

- [ ] Job-change detection — simplified to web-search-only per product decision (2026-07-05), superseding the CSV-diff mechanism in BRD §6.7: shares the signal-detection sweep with the news watchlist below, `kind: "job_change"` when the search results show a different title/employer than what's on file. Typecheck/lint/build/tests pass; manual click-through needs a real `FIRECRAWL_API_KEY` + `ANTHROPIC_API_KEY`, not done
- [ ] Opt-in news watchlist: per-contact "Watch for job changes & news" toggle (contact page) → nightly cron (`/api/jobs/detect-signals`, `apps/web/vercel.json`) → provider-agnostic web search (`packages/core/src/search`, Firecrawl by default — cheaper per-search than an LLM's own web-search tool) → Haiku classifies hits → `signals` table → Home "Signals" feed + contact page, "Add as note" (receipted) or dismiss. Capped per plan (`PRO_TIER_WATCHLIST_CAP`/`FREE_TIER_WATCHLIST_CAP`). Typecheck/lint/build/tests pass (`signals.test.ts`, `search-client.test.ts`); manual click-through not done (needs live API keys); hosted multi-tenant RLS scoping for this job is a known follow-up (it currently runs against the default connection, correct for self-host, same posture as the Telegram webhook) — **fixed 2026-07-12: separately, `signals` had been left out of `packages/ee`'s `TENANT_TABLES` entirely, so unlike every other tenant table it had no RLS policy at all; `getSignal`/`dismissSignal`/`markSignalNoted` key only by signal id with no ownership check, so this was a real cross-tenant read/dismiss/"add as note" hole in hosted mode, not just the job-connection posture noted above. Added to `TENANT_TABLES` (`rls-ddl.ts`). The nightly job's own non-tenant-scoped connection (this paragraph's original point) is unrelated and still an open follow-up**
- [x] Keep-in-touch cadence reminders + Home reach-out feed (ideas.md #2)
- [ ] Automatic relationship-decay detection — built read-time (no nightly job needed): "Going quiet" feed on Home surfaces contacts with no touch in ~8 months and no cadence set (`repo/strength.ts`); typecheck/lint/build/tests pass, manual click-through not done
- [ ] Relationship-strength score from own-graph data (interaction recency/frequency, notes, sessions — no external data) — built: 0–100 recency×frequency score (`scoreStrength`), ranks the Going-quiet feed strongest-first; tests in `strength.test.ts`, manual click-through not done
- [x] Post-event digest email (user-triggered from the session page, template-based)
- [x] Pre-meeting brief on demand ("Brief me ✦" on the contact page, graph-only)
- [ ] Calendar integration → brief pushed 30 min before the meeting

## 15. Graph power (v1.3)

- [x] Warm-path finding (BFS over edges/companies/sessions — no AI cost)
- [x] Second-degree suggestions ("Nearby in your network" — ideas.md #1, local-only traversal)
- [x] Relationship timeline view (captures, sessions, notes, touches on the contact page)
- [ ] Watch app / widgets

## 16. Ecosystem (v1.4)

- [ ] Salesforce/HubSpot/Notion export-sync
- [x] Outbound webhooks (contact.created, followup.created → `DHAGA_WEBHOOK_URL`)
- [x] Telegram bot: capture + ?questions from chat (ideas.md #6; owner-only, secret-verified)
- [ ] WhatsApp capture (needs Meta business API)
- [ ] LinkedIn QR format support — pure matcher `packages/core/src/capture/linkedin-qr.ts` (unit-tested, `apps/web/src/lib/__tests__/linkedin-qr.test.ts`); web: `QuickAddForm/PhotoCaptureInput.tsx` detects via BarcodeDetector and routes to `/app/people/new?linkedin=` (prefills the existing manual-add form, no auto-create); mobile: `camera-capture-view.tsx` scans live via expo-camera, `LinkedInQrPrompt` hands off to the web form via `Linking.openURL` (mobile has no manual-add screen of its own to route to — see docs/notes, this is the closest honest equivalent). Typecheck/lint/test all pass; manual browser + device click-through still pending
- [ ] Email/calendar interaction sync (Gmail/Outlook OAuth, explicit opt-in) — the one ToS-clean ambient-capture channel (BRD §6.7)

## 17. Teams (v2.0 — revenue engine)

- [ ] Org workspace, contact-level sharing controls
- [ ] "Who knows whom" across team
- [ ] SSO; per-seat billing

## 18. Monetization & launch

- [ ] Access-request API (`/api/access-requests`, `packages/ee`) wired to real storage; landing form posts to it — replaces the old public waitlist, gated behind `DHAGA_HOSTED_MODE`; code confirmed backed by a real Drizzle/Postgres table (2026-07-07 audit), no stub — only remaining bar is a human clicking through the flow in a browser
- [ ] Free tier caps live; Pro (lifetime $79 first-500 / $8 mo) checkout — Stripe Checkout + webhook built (§19); real Stripe Product/Price setup + a live test-mode purchase still needed
- [x] Self-host docs — [SELF_HOSTING.md](SELF_HOSTING.md) (no `packages/ee` needed)
- [ ] `docker compose up` — `Dockerfile` + `compose.yml` already exist at repo root (`0c774da`, single-stage Node 22 web image + pgvector/pgvector:pg17 db service with healthchecks); looks complete on read-through but has not actually been run end-to-end (no local Docker available as of 2026-07-07)
- [ ] Public roadmap + good-first-issues — `docs/ROADMAP.md` written 2026-07-07 (needs linking from README to be truly "public"); good-first-issue candidates drafted but intentionally not posted as real GitHub issues yet (that's a public/outward action for the owner to approve, see `docs/notes-2026-07-07.md`)
- [ ] Replace randomuser.me landing portraits with licensed photos before paid marketing

## 19. SaaS platform — accounts, multi-tenancy, billing, admin (Dhaga Cloud)

Everything in this section is typecheck/lint/build/vitest-clean (including a
build with `packages/ee` and its exclusive route folders physically removed,
confirming the AGPL core doesn't need it — as of 2026-07-07 this is enforced
on every push by the `verify-without-ee` CI job, not just a one-off manual
check) but **not yet manually click-tested in a browser or pushed** — the
checklist bar for `[x]` needs both, so these stay unchecked until that
happens. A 2026-07-07 code audit confirmed every item below is backed by
real, substantive implementation (RLS policies, Stripe integration matching
the "4 event types" claim exactly, real `notFound()` admin gating) — none of
this is a stub, the only gap is the manual click-through + push.

- [ ] Real accounts (better-auth email/password) replacing the single shared `DHAGA_PASSWORD`; `/login` + `/signup` — **flagged 2026-07-07: this is the same code/checkbox as §2's "Auth: real accounts", not a distinct multi-tenant implementation** (`DHAGA_PASSWORD` doesn't exist anywhere in code, only in this checklist); consider deleting one of the two entries once confirmed there's no separate hosted-mode acceptance bar
- [ ] Per-user personal access tokens (better-auth `apiKey` plugin) replacing `DHAGA_API_TOKEN`, settings UI to create/revoke — **flagged 2026-07-07: duplicate of §12's "Per-user API keys"**, same `apiKey` plugin/settings UI, not SaaS-specific
- [ ] Multi-tenant data isolation via Postgres Row-Level Security, entirely in `packages/ee` — zero query-logic changes in `apps/web/src/lib/repo/*`
- [ ] Open-core boundary: `packages/ee` (source-available, PolyForm Shield 1.0.0 — see `packages/ee/LICENSE`), self-host runs fully without it (`SELF_HOSTING.md`)
- [ ] Early access: public request form → admin approve/reject → gated signup (`DHAGA_HOSTED_MODE` only; inert and 404s otherwise)
- [ ] Admin panel (`/app/admin`): dashboard, access requests, users, subscriptions — 404s for non-admins
- [ ] First-admin bootstrap via `DHAGA_ADMIN_EMAILS` (see `SELF_HOSTING.md`)
- [ ] Stripe billing: Checkout (Pro/Lifetime), billing portal, webhook (4 event types), AI-cap bypass for paid users
- [ ] Billing UI cleanly absent (not broken) when `STRIPE_SECRET_KEY` is unset, even in hosted mode
