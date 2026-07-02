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
- [x] `.env.example` documenting every env var
- [ ] CI (lint + typecheck + build on push)
- [ ] Fix Dependabot alert #1 (moderate)
- [ ] Deploy to Vercel (landing + app)

## 1. Shared core — `packages/core`

- [x] Zod contact schema (name, title, company, emails[], phones[], links, location)
- [x] Zod extraction schema (facts, relationships, follow_ups, tags) per BRD §6.3
- [x] `LLMClient` interface (Dependency-Inversion contract)
- [x] `AnthropicLLMClient` — structured outputs via Zod-derived JSON schema
- [x] Prompt builders (pure functions): contact parse, note extraction
- [ ] Prompt builders: search query understanding, follow-up draft
- [x] `getLLMClient()` factory (env-driven; Ollama/BYO-key = future implementations)
- [x] Heuristic (no-LLM) contact parser fallback — email/phone/URL regex + name lines
- [ ] Shared API types (request/response contracts used by web now, mobile later)

## 2. Web app shell (v1.1 surface, built first)

- [ ] Auth: password login (`DHAGA_PASSWORD`), signed httpOnly session cookie
- [ ] Middleware: every `/app` page + `/api/*` route (except login) requires session
- [ ] App layout: nav (People / Sessions / Search / Quick-add), mobile-first at 375px
- [ ] Empty states, loading skeletons, error states on every screen
- [ ] Dark warm theme reused from landing tokens

## 3. Data layer (BRD §7.4 — boring storage)

- [ ] PGlite (embedded Postgres) + Drizzle; hosted Postgres = driver swap
- [ ] `contacts` table
- [ ] `companies` table
- [ ] `sessions` + `session_contacts` tables (M2)
- [ ] `notes` table (kind: voice|text, transcript, audio_path)
- [ ] `facts` table (type, text, confidence, `source_note_id`, `deleted_at`)
- [ ] `edges` table (src/dst typed, predicate, `source_note_id`)
- [ ] `embeddings` table (pgvector column; deferred until vector search lands)
- [ ] `follow_ups` table
- [ ] `ai_actions` metering table (per-user, per-month counts — day one requirement)
- [ ] Deletion cascade: contact → notes → facts → edges → embeddings ("forget this person")
- [ ] Note deletion tombstones derived facts/edges (receipts invariant)

## 4. Capture — web quick-add (v1.1, M1-equivalent for web)

- [ ] Paste email signature / free text → extracted contact (LLM, heuristic fallback)
- [ ] Edit-before-save review form (M1 acceptance: user confirms fields)
- [ ] Assign capture to a session (create/pick "Web Summit 2026")
- [ ] Attach source text as first note (receipt for extracted fields)
- [ ] Manual add-contact form (no extraction path)
- [ ] Company auto-link: extracted company name → find-or-create `companies` row

## 5. Sessions / auto-grouping (M2)

- [ ] Sessions list + session page (contacts met there)
- [ ] Create/rename/merge sessions
- [ ] Web: active-session default (captures within same day attach to active session)
- [ ] Mobile (later): time + geohash clustering per BRD §6.2

## 6. Notes & entity extraction (M3, M4)

- [ ] Text notes on a contact (add, list, delete)
- [ ] Extraction: note → facts/relationships/follow-ups/tags (Haiku, structured output)
- [ ] Facts render on contact page with receipt ("from note, {date} — tap to view")
- [ ] User can edit/delete a fact (M4 acceptance)
- [ ] Deleting a note tombstones its derived facts/edges
- [ ] Voice notes + on-device transcription (mobile milestone)

## 7. Knowledge graph v0 (M5)

- [ ] Relationship edges written from extraction (`works_at`, `knows`, `used_to_work_at`, …)
- [ ] Contact page: same-company + same-session connections render
- [ ] Graph browser page (React Flow — reuse landing graph patterns)
- [ ] Tag ontology v0 (tags from extraction, filterable)

## 8. Natural-language search (M6)

- [ ] Keyword + structured search (SQL ILIKE over contacts/notes/facts) — free path
- [ ] Query understanding: LLM → structured filters + semantic residual
- [ ] Embeddings + pgvector similarity (open embedding model or API)
- [ ] Rerank + answer with citations to underlying notes (Sonnet)
- [ ] Acceptance: seeded test set — correct contact in top 3

## 9. AI follow-up drafts (M7)

- [ ] One-tap draft using notes + session context + facts (Sonnet, cache-friendly prompt)
- [ ] Draft references ≥1 note-derived fact (acceptance)
- [ ] Edit + copy-to-clipboard flow

## 10. Metering, cost control (BRD §8.2–8.3)

- [ ] Every AI call logged to `ai_actions` (feature, model, tokens in/out)
- [ ] Free-tier cap enforced (25 cloud AI actions/month) with clear UI message
- [ ] Prompt caching on stable system prompts
- [ ] Batch API for nightly jobs (v1.2, when jobs exist)

## 11. Privacy & export (M8, BRD §7.5)

- [ ] "Forget this person" — full cascade delete with confirmation
- [ ] Export: contacts CSV
- [ ] Export: vCard
- [ ] Export: full JSON dump (contacts+sessions+notes+facts+edges)
- [ ] No contact PII / transcripts / extraction output in server logs
- [ ] Enrichment & cloud AI strictly user-triggered (no background calls)

## 12. Mobile app — `apps/mobile` (BRD MVP platform; separate milestone)

- [ ] M0 spike: Expo app, camera → Vision/ML Kit OCR → Haiku parse → contact saved
- [ ] M1 card scan: edit-before-save, ≥90% accuracy on clean cards, <5s
- [ ] M2 auto event grouping (time + geohash clustering, name-once prompt)
- [ ] M3 voice notes: whisper.cpp / Apple Speech on-device transcription
- [ ] M8 local-first SQLite (op-sqlite) + sqlite-vec; full offline
- [ ] Sync engine (field-level LWW or PowerSync/ElectricSQL — decide per BRD §11)
- [ ] E2E-encrypted backup/sync
- [ ] EAS builds: .aab (Play) + .ipa (App Store); store listings

## 13. Browser extension (v1.1)

- [ ] Chrome/Edge extension scaffold sharing web quick-add TS core
- [ ] One-click capture from LinkedIn profile / article (active tab, explicit click only)
- [ ] "Save this article to {contact}" linking

## 14. Proactive intelligence (v1.2)

- [ ] Job-change detection (nightly Batch API job, diffs → alerts)
- [ ] Relationship-decay alerts ("no contact in 8 months")
- [ ] Post-event digest email
- [ ] Pre-meeting briefs (calendar integration → push 30 min before)

## 15. Graph power (v1.3)

- [ ] Warm-path finding (BFS over edges — no AI cost)
- [ ] Second-degree suggestions
- [ ] Relationship timeline view
- [ ] Watch app / widgets

## 16. Ecosystem (v1.4)

- [ ] Salesforce/HubSpot/Notion export-sync
- [ ] Zapier / webhooks
- [ ] LinkedIn QR format, WhatsApp share-to-capture

## 17. Teams (v2.0 — revenue engine)

- [ ] Org workspace, contact-level sharing controls
- [ ] "Who knows whom" across team
- [ ] SSO; per-seat billing

## 18. Monetization & launch

- [ ] Waitlist API (`/api/waitlist`) wired to real storage (landing form is demo-only)
- [ ] Free tier caps live; Pro (lifetime $79 first-500 / $8 mo) checkout
- [ ] Self-host docs (`docker compose up`)
- [ ] Public roadmap + good-first-issues
- [ ] Replace randomuser.me landing portraits with licensed photos before paid marketing
