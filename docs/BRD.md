# Dhaga — Business Requirements Document

*(Product renamed from working title "NetworkPro" to **Dhaga** — धागा, "thread" — July 2026. Mentions of NetworkPro below are historical.)*

**Product:** Dhaga — Intelligence in Your Network
**Version:** 0.1 (Draft)
**Date:** 2 July 2026
**Owner:** Anchit Shrivastava

---

## 1. Executive Summary

NetworkPro is an AI-native personal CRM that turns fleeting professional encounters into a living, searchable knowledge graph. Where legacy products (the incumbent card scanner, CamCard) stop at "scan a card → save a contact," NetworkPro treats the scan as the *ingestion point* of a compounding intelligence system: contacts are auto-grouped by context (event, time, place), enriched with public data, connected through voice-note-derived relationships, and made queryable in natural language.

**One-line pitch:** *Your professional memory, augmented.*

**Business model:** Open-core. The client apps and self-hostable core are open source (community trust, zero-cost adoption, contributor leverage); revenue comes from a hosted cloud tier (sync, enrichment, team graph) and a one-time "lifetime" purchase echoing the incumbent card scanner's pricing model that validated this market.

---

## 2. Problem Statement

1. **Capture is easy; memory is not.** Existing card scanners digitize contacts but lose all context: *where* you met, *what* you discussed, *why* it mattered. Six months later the contact is a dead row in an address book.
2. **Notes don't compound.** Even diligent networkers who take notes can't query across them ("who did I meet in logistics who mentioned an AI budget?").
3. **Networks decay silently.** Job changes, funding events, and relationship staleness go unnoticed — precisely the moments when outreach is most valuable.
4. **Incumbents are stagnant.** The incumbent card scanner is functionally identical to its 2015 self; it validated willingness-to-pay (AUD $99.99 one-time) without ever adding intelligence. The category is ripe for an AI-native replacement.

## 3. Target Users

| Persona | Description | Primary jobs-to-be-done |
|---|---|---|
| **Conference-heavy sales/BD** | Attends 6–20 events/year, meets 30–100 people per event | Capture fast, follow up same-day, recall context before next meeting |
| **Founders & fundraisers** | Networks across investors, partners, hires | Warm-path finding, relationship maintenance, investor tracking |
| **Consultants / freelancers** | Business depends on referral network | Long-tail recall, staleness alerts, sector-based search |
| **Teams (v2)** | Sales/partnership teams sharing relationship intelligence | "Who at our company knows someone at X?" |

## 4. Competitive Landscape (researched July 2026)

The market splits into five camps. Nobody occupies the intersection NetworkPro targets: **event-native capture + private knowledge graph + AI intelligence + open source**.

### 4.1 Camp A — Card scanners & digital business cards

| Product | Pricing | Strengths | Weaknesses vs NetworkPro |
|---|---|---|---|
| **The incumbent card scanner** | AUD $99.99 one-time | Best-in-class OCR (25 languages), Salesforce export, proven lifetime-price model | Frozen product; zero intelligence, no context, no notes, no search |
| **A digital business-card app** | Free / paid tiers | Top-rated digital card on G2 (8,800+ reviews); simple shareable profile; card + badge scanning | Their graph is *outbound* (share my card), not *inbound* (remember who I met); no notes/knowledge layer |
| **An enterprise digital-card app** | Free / team tiers | Polished; enterprise-grade (SOC 2, SSO/SAML/SCIM); card + badge scanner, email signatures | Same — digital-identity tool, not memory tool |
| **An NFC badge-scanner / lead-capture tool** | Free / paid + NFC hardware | NFC tap-to-share; universal badge scanner with ~90% AI enrichment success; strong at events | Lead-capture for exhibitors, priced/designed for sales teams at booths, not attendees building a personal network |

**Takeaway:** this camp has nailed *capture UX* (badge scanning is now table stakes — we must match it earlier than planned) but treats the contact as the end product. None build a queryable memory on top.

### 4.2 Camp B — Personal CRMs

| Product | Pricing | Strengths | Weaknesses vs NetworkPro |
|---|---|---|---|
| **An auto-enrichment inbox CRM** | Free ≤1,000 contacts; Pro ~$10/mo | Closest philosophical competitor: auto-ingests email/calendar/LinkedIn/Twitter, web-based enrichment, reconnect nudges | Desktop/inbox-centric — no card/badge/voice capture at events; enrichment-feed model, not a user-built knowledge graph; closed source; US-cloud privacy posture |
| **A sync-based personal CRM** | ~$12/mo (free tier very limited) | LinkedIn + email sync, reminders, cross-platform | Manual/import-centric capture; no event context; no NL search over notes |
| **A business-card-scanner contact app** | ~$9.99/mo | Mobile-first, auto-enriches phone contacts, staying-in-touch nudges; strong security posture | Enrichment of the address book, not capture of new encounters; no graph, no voice notes |
| **A lightweight team CRM** | From $18/user/mo | LinkedIn Chrome extension (1-click capture), AI icebreakers, pipelines | Team sales CRM in personal clothing; per-seat pricing; no mobile event capture |

> Named, detailed head-to-head comparisons live in the public comparison pages (see the blog: `/blog/guides/dhaga-vs-monica`, `dhaga-vs-dex`, `dhaga-vs-yourpond`, `dhaga-vs-openvc`, `dhaga-vs-louisa`, and the roundups).

**Takeaway:** subscription fatigue is real in this camp ($10–18/mo for what users perceive as a contacts app), and every one of them is weak at *in-person event capture* — our wedge.

### 4.3 Camp C — Team relationship intelligence (the high end)

| Product | Pricing | Notes |
|---|---|---|
| **A VC/PE relationship-intelligence platform** | $2,000–2,700/user/**year** (published) | VC/PE standard; email-mining based "who knows whom"; validates that relationship graphs command serious money |
| **A private-markets relationship-intelligence tool** | ~$100–300/user/**month** | Same category, private markets focus |

**Takeaway:** these prove the *team graph* (our v2.0) is worth $1.8K–3.6K/user/year to relationship-driven firms. A bottoms-up, capture-first product that grows into a lightweight team graph at 1/10th the price is a classic disruption path.

### 4.4 Camp D — Capture extensions (sales tooling)

One-click LinkedIn→CRM enrichment extensions — Chrome extensions with enrichment (20+ data points/contact) — are all sales-prospecting tools feeding team CRMs. This validates the browser-extension capture pattern we're adopting, but none feed a *personal, private* graph — and their scrape-heavy enrichment posture is exactly the privacy stance we differentiate against.

### 4.5 Camp E — Open source

| Product | Notes |
|---|---|
| **The established open-source personal-relationship manager** | The OSS personal-relationship manager (personal life focus: birthdays, family). No mobile app, no email/calendar/LinkedIn sync, fully manual entry, no AI. Popular repo, but a journal — not a networking tool |
| **A well-designed open-source sales CRM** | Well-designed OSS sales CRM (inspired by modern SaaS CRMs). Team pipelines, not personal networks; no capture layer |

**Takeaway:** the open-source niche for an *AI-native, mobile-first, professional* network tool is **empty**. The established open-source relationship manager's popularity despite its limitations shows the demand for self-hostable relationship software.

### 4.6 Positioning statement

> For professionals who build their careers on in-person and online networking, NetworkPro is the only tool that captures a contact from anywhere — card, badge, QR, LinkedIn page, pasted email — in one action, and turns every note into a private, searchable knowledge graph with proactive intelligence. Unlike digital-card apps it remembers *who they are to you*; unlike personal CRMs it captures at the moment of meeting; unlike enterprise relationship platforms it is affordable, personal, and open source.

**Strategic implications adopted into scope:**
1. **Badge scanning moves up** to v1.1 (the digital-card and badge-scanner apps made it table stakes).
2. **Browser extension is a first-class capture surface** (validated by adoption of the one-click LinkedIn-capture pattern) — promoted into v1.1.
3. **Lifetime pricing stays** (the incumbent card scanner's anchor) alongside subscription — an explicit counter to Camp B's subscription fatigue.
4. **Privacy/open source is the marketing spearhead** against the auto-enrichment / sync CRMs and the sales-tooling camp.

---

## 5. Product Scope: MVP vs Full Product

### 5.0 Platform scope

| Surface | Purpose | Phase |
|---|---|---|
| **Mobile app — iOS + Android** (single React Native codebase) | Primary capture (camera, mic) + full experience | **MVP** — both OSes ship together; RN makes the delta small, and Android matters in APAC/EU conference markets |
| **Web app** | Quick-add & desk workflows: paste an email signature, a LinkedIn URL, or an article link → extract/attach to a contact; full graph browsing and search on a big screen | v1.1 |
| **Browser extension** (Chrome/Edge first, Firefox later) | One-click "Add to my network" on any LinkedIn profile, news article, or company page; article-to-contact linking ("save this article to Sarah") | v1.1 |
| Apple Watch / widgets | Glanceable pre-meeting briefs | v1.3+ |

The web app and extension share one TypeScript core (parsing, API client) — the extension is effectively the web quick-add panel in a popup. Both write through the same ingestion API the mobile app uses, so every capture surface feeds the same graph.

### 5.1 MVP (target: 3–4 months to TestFlight/Play beta)

The MVP must prove one loop end-to-end:

> **Scan → auto-group by event → voice note → entity extraction → natural-language search → AI follow-up draft**

| # | Feature | Description | Acceptance criteria |
|---|---|---|---|
| M1 | Card/badge scan | Camera capture → on-device OCR → structured contact (name, title, company, email, phone) with edit-before-save | ≥90% field accuracy on clean Latin-script cards; <5s scan-to-review |
| M2 | Auto event grouping | Scans within a time+location cluster grouped as an "Event"; user names it once ("Web Summit 2026") | Contacts scanned same day/venue auto-attach to the active event |
| M3 | Voice + text notes | Attach a voice note per contact; on-device transcription | Transcript attached in <10s for a 60s note |
| M4 | Entity extraction | LLM extracts entities/facts from notes: role, intent, personal facts, relationships ("used to work at X", "knows Y") | Structured facts visible on contact; user can correct/delete |
| M5 | Knowledge graph (v0) | Contacts, companies, events, facts stored as nodes/edges; browsable per contact | "Same company" and "same event" connections render on contact page |
| M6 | Natural-language search | "Who did I meet at GITEX in fintech?" → ranked contacts | Hybrid vector + structured search returns correct contact in top 3 for seeded test set |
| M7 | AI follow-up draft | One-tap personalized follow-up email/LinkedIn message using notes + context | Draft references at least one note-derived fact; user edits & copies/shares |
| M8 | Local-first storage + export | All data on device (SQLite); CSV/vCard export; optional encrypted cloud backup | App fully functional offline; export round-trips |

**Explicitly out of MVP:** team features, enrichment from external sources, change-detection alerts, Android badge/QR formats beyond vCard QR, CRM integrations, Apple Watch.

### 5.2 Full Product (12–18 month horizon)

| Phase | Feature cluster | Contents |
|---|---|---|
| **v1.1 — Capture everywhere** | New surfaces + enrichment | **Web app quick-add** (paste email/article/LinkedIn URL → extract → link to contact); **browser extension** (one-click add from LinkedIn/articles, "save this article to Sarah"); **LinkedIn Connections CSV import** (user's own LinkedIn data export — ToS-safe bulk import, see §6.7); **vCard (.vcf) / device-contacts import** (user's own exported .vcf from iPhone/iCloud, Android, or Google Contacts — one file, parsed in-browser, nothing scraped, see §6.7); **one-click Google / Outlook-Hotmail contacts connectors** (OAuth, user connects their own account — no Apple/iCloud API exists, see §6.7); **mobile on-device contacts import** (expo-contacts, permission-gated); **badge scanning** (table stakes per competitor analysis); user-triggered public-web enrichment; email-forwarding ingestion |
| **v1.2 — Proactive intelligence** | Alerts & digests | Keep-in-touch cadence reminders (recurring, dismissed only on "reached out"), job-change detection (LinkedIn-export re-import diff + watchlist hits, see §6.7), **opt-in news watchlist** (starred contacts, nightly Batch web search, per-tier cap), relationship-decay alerts ("no contact in 8 months"), post-event digest email, **birthday/anniversary reminders** (derived from the dates saved on a contact — in-app and opt-in email), pre-meeting briefs via calendar integration |
| **v1.3 — Graph power** | Deep graph | Warm-path finding ("who can intro me to Airbus?"), second-degree suggestions, sector/tag ontology, timeline view of the relationship, watch/widgets |
| **v1.4 — Ecosystem** | Integrations | Salesforce/HubSpot/Notion sync, Zapier/webhooks, LinkedIn QR formats, WhatsApp share-to-capture, **email/calendar interaction sync** (Gmail/Outlook OAuth, opt-in — the one ToS-clean ambient-capture channel, see §6.7), **personal MCP server** (built 2026-08-02 — any MCP client reads and additively writes the user's own graph at `/api/mcp`, see §6.8) |
| **v2.0 — Teams** | Shared graph | Org workspace, contact-level sharing controls, "who knows whom" across the team, SSO; this is the primary revenue engine |

### 5.3 MVP vs Full Product — at a glance

| Dimension | MVP | Full Product |
|---|---|---|
| Capture | Card scan (single or multi-image), vCard QR, voice notes (mobile) | + badges, photo notes (whiteboard/poster/handwriting → transcribed into the note body), web quick-add (paste email/article/URL), browser extension one-click add, LinkedIn Connections CSV import, vCard import, Google Contacts CSV import, Google/Outlook OAuth connectors, mobile device import, email forwarding, LinkedIn QR, call-log prompts |
| Intelligence | Extraction + NL search + follow-up drafts | + enrichment, change detection, decay alerts, pre-meeting briefs, warm paths |
| Graph | Per-user, on-device, basic edges | Rich ontology, article-to-contact links, team-shared graph, cross-user dedup |
| Platform | iOS + Android (one RN codebase) | + web app + browser extension + watch/widgets |
| Sync | Optional encrypted backup | Full multi-device sync (mobile ↔ web ↔ extension), team workspaces |
| Monetization | Free beta | Free tier + Pro (lifetime or annual) + Teams (per-seat) |

### 5.4 Considered features backlog (2026-07 review)

A July 2026 competitive review surfaced feature gaps. The genuinely-additive ones (deduped against existing scope) are captured below as **backlog — considered, not committed, and (except where a Notes cell says otherwise) unbuilt.** They inherit Dhaga's constraints: own-graph-first, no scraping, privacy by default (§6.7). Tracked as unchecked items in [checklist.md](checklist.md) §20.

| Candidate | Notes |
|---|---|
| **Duplicate-contact detection & merge (entity resolution)** across import sources | **Built 2026-07-27 (web).** `/app/people/duplicates` clusters likely duplicates (shared email / phone / similar name), each with a per-field **Merge** that folds all multi-value data onto a chosen survivor in one atomic transaction; the same batch shipped **companies management** + company merge/dedup (`/app/companies`, `/app/companies/duplicates`). No schema change. Distinct from the team-graph cross-user dedup in §5.3 — this is per-user resolution across LinkedIn/vCard/Google/manual sources. See checklist §4/§20. Mobile parity pending |
| **AI-suggested connections** — surface likely graph edges from shared company/school/city/event | Backlog. Own-graph inference only; suggested, never auto-linked (mirrors the confirm-inbox pattern) |
| **Relationship analytics dashboard** — most-connected, longest-known, city clusters, network growth | Backlog. Read-only stats over the user's own graph; no external data |
| **Profile-completeness scoring + enrichment nudges** | Backlog. Nudge to fill gaps; enrichment stays user-triggered per §7.5 |
| **Map view of contacts' locations** ("who's nearby when I travel") | Backlog. Renders locations the user already holds; no live tracking |
| **Personal-life logging modules (optional)** — gift tracking, journal/diary + mood, activity log, debt tracking, pets | Backlog. Optional modules to reach broader personal-relationship breadth; off by default so the professional-networking core stays uncluttered |
| **Mail-merge / bulk personalized outreach + public API + Zapier app** | Backlog. Extends the existing outbound webhooks (checklist §16) and the Zapier/webhooks line already in §5.2 v1.4; bulk outreach is the new delta |
| **Two-way native phone address-book sync** | **Built 2026-07-29 (mobile + server) — code-complete, unverified on a device.** Extends the one-way expo-contacts import (§6.7) into a user-triggered two-way reconcile: three-way merge against a per-link base snapshot (`packages/core/src/sync`), `contact_links` link table, `POST /api/sync/contacts` (+ `/ack`), mobile **Sync contacts** screen. Only the nine vCard-shaped fields round-trip — notes, AI-derived facts, graph edges and signal state are never written to an address book, because an address book syncs onward to laptops, cars and shared devices. iOS writes into a `cardDAV`/`exchange` container and lets the OS relay to iCloud/Google, so no Google contacts-write scope is needed; on **Android** contacts Dhaga creates stay device-local (expo-contacts exposes no account/`ACCOUNT_TYPE` control), though edits to existing contacts ride the owning account. **No runtime/device testing yet.** See checklist §20 and the user guide (`/docs/guide/syncing-your-phone`) |
| **Voice dictation self-correction** — spoken self-edits ("schedule at 3, no make it 4") folded into the transcript, both a semantic LLM pass and a deterministic number/time pass | Backlog — **deferred pending a dedicated GPU host** for the correction model. Prototyped in the browser-voice R&D (separate `llm-experiments` repo, `feat/voice-browser-jarvis`): the real-time in-browser STT (Moonshine, WebGPU) is proven and is the intended `whisper-base` replacement — it ports independently and now. But the in-browser correction LLM is **CPU-bound (~48 s/edit) on consumer GPUs** where WebGPU falls back to CPU — too slow to be the "then and there" correction the product needs. Ships when a dedicated 24 GB-class GPU can host the correction model server-side (aligns with the §7.2 Phase-2 server tier). The STT-side layers (phonetic teaching, deterministic cleanup) are **not** part of this deferral — they ship with the STT |

**Promoted out of this table:**

- *Personal MCP server* was listed here as backlog ("read-only, user-scoped"). It **shipped on 2026-08-02**, and wider than that: read *and* additive write. It is now a product feature with its own mechanics section — see §5.2 v1.4 and **§6.8**.

**Already covered — not re-added:**

- *Relationship-strength scoring* is already scoped: §6.7 "Relationship strength" row + checklist §14.
- *LinkedIn import & job-change detection / reach-out nudges* are already scoped: LinkedIn Connections CSV + QR import (§6.7, checklist §4/§16), job-change detection + news watchlist + keep-in-touch cadence (§5.2 v1.2, checklist §14). Continuous *automatic* LinkedIn network sync is **not** on the roadmap — it requires scraping/session-piggybacking, a §6.7 hard line.
- *WhatsApp capture* is already tracked (§5.2 v1.4, checklist §16).

**Considered and declined (different product / against policy):**

- **iMessage / SMS capture** — declined. SMS/call-log ingestion is a §6.7 hard line (blocked by iOS, disallowed by Play Store policy). WhatsApp share-to-capture (§5.2 v1.4) is the ToS-clean equivalent.
- **External fundraising suite** — a curated *external* investor database, cold-outreach sequences, pitch-deck hosting/analytics, and an AI deck reviewer. Declined: that is a fundraising-discovery product, not a personal CRM. Dhaga records the investors *you* actually meet; it does not sell an external investor list or run outbound campaigns.
- **Enterprise org graph** — a firm-*owned* relationship graph mined at bank/PE scale. Declined: Dhaga's team story is individual-first (§5.2 v2.0 / checklist §17 "who knows whom" across a small team), not an enterprise deal-intelligence platform whose graph the employer owns.

---

## 6. How It Will Be Achieved — Feature-by-Feature Mechanics

### 6.1 Capture (M1)

- **OCR is free and on-device.** iOS: Apple Vision framework (`VNRecognizeTextRequest`) — excellent accuracy, zero cost, zero latency, zero privacy exposure. Android: Google ML Kit Text Recognition (also free, on-device).
- OCR yields raw text lines + bounding boxes. A **small LLM call** (or on-device model) converts raw OCR text → structured contact JSON (name/title/company/email/phone/address), handling layout ambiguity that regex can't ("is this line a company or a title?").
- Fallback for degraded/multilingual cards: server-side pass with a vision-capable model (send the image, get structured JSON directly). This is the premium path, used only when on-device confidence is low.
- **One card, one or many photos.** A single capture can bundle multiple images of the same card (front + back) or a multi-page leaflet — via multi-shot camera, desktop live webcam, or multi-file upload on web and mobile; the server vision pass merges them into one contact and keeps every image as a receipt. (Extracting *several* contacts from one leaflet is not yet in scope — a multi-image capture always yields a single contact.)

### 6.2 Auto-grouping (M2)

Pure client-side logic — no AI needed for v0:
- Each scan records `timestamp` + coarse `geohash` (with user permission).
- Scans within a rolling window (same geohash-6, gaps <4h) cluster into a **Event**.
- First scan in a new cluster prompts once: "Name this event?" (pre-filled from calendar if an all-day event matches).
- Later (v1.2): batch LLM pass suggests merging/splitting events and infers "these 3 people were probably in the same conversation" from sub-minute scan proximity.

### 6.3 Notes → Knowledge Graph (M3–M5)

- **Transcription:** on-device, free, private. **Web:** *Dhaga Voice* (Moonshine tiny) streams the transcript live in the browser — **WebGPU-required, with no fallback** (voice is unavailable when WebGPU is absent). **Mobile:** whisper.cpp (or Apple's on-device speech APIs on iOS 17+).
- **Extraction:** one structured-output LLM call per note. Schema (enforced via the API's `output_config.format` JSON schema, so output is guaranteed parseable):

```json
{
  "facts": [{"type": "role|intent|personal|preference", "text": "...", "confidence": 0.9}],
  "relationships": [{"subject": "contact", "predicate": "works_at|used_to_work_at|knows|reports_to|invests_in|competitor_of", "object": "Acme Corp", "object_type": "company|person"}],
  "follow_ups": [{"action": "...", "due_hint": "when their fiscal year starts"}],
  "tags": ["fintech", "decision-maker"]
}
```

- **Graph storage:** nodes (`person`, `company`, `event`, `tag`) and edges (typed, timestamped, source-linked to the originating note) in plain relational tables. A property graph in SQLite/Postgres is entirely sufficient at this scale — a dedicated graph DB (Neo4j) is deliberate over-engineering for <100k nodes per user. Every fact keeps a pointer to its source note for auditability ("why does the app think Sarah is leaving Stripe?").

### 6.4 Natural-language search (M6)

Hybrid retrieval, three stages:
1. **Query understanding:** small LLM call converts the query into structured filters (`event=GITEX`, `sector≈fintech`) + a semantic residual.
2. **Candidate retrieval:** structured filters via SQL + semantic match via vector embeddings over notes/facts (sqlite-vec on device; pgvector in cloud). Embeddings from an open model (e.g. `bge-small` / `nomic-embed-text`) — runnable on-device or on a $5 VPS.
3. **Rerank + answer:** LLM reranks top-20 candidates and composes the answer with citations to the underlying notes.

Stage 1 and 3 are skippable for simple queries (keyword fallback), keeping most searches free and instant.

### 6.5 Follow-up drafts (M7)

Single LLM call: contact + event context + extracted facts + user's writing-style sample → draft. Prompt-cached system prompt makes marginal cost negligible (see §9).

### 6.6 Full-product intelligence (v1.1+)

- **Enrichment:** user-triggered web search/fetch for the contact's public footprint (company news, funding, role verification) → summarized into graph facts. Runs through the LLM's server-side web search tooling or a search API; always attributed, always deletable.
- **Change detection:** nightly **Batch API** job (50% cost discount, latency-insensitive) re-checks key contacts' public signals; diffs become alerts ("Marcus is now VP at …").
- **Pre-meeting briefs:** calendar webhook → assemble contact dossier from graph → one LLM call → push notification 30 min before the meeting.
- **Warm paths:** pure graph traversal (BFS over `works_at`/`used_to_work_at`/`knows` edges) — no AI cost.

### 6.7 Source legality — the enrichment-feed auto-sync we can and can't do (researched 2026-07)

Auto-enrichment CRMs claim continuous auto-recording from LinkedIn and Twitter. That runs on
user-session piggybacking or scraping: LinkedIn's API is partner-gated, closed to CRM/enrichment
tools (the Connections API died in 2015; Proxycurl was shut down by LinkedIn legal in 2025), and
X's API has no free read tier (pay-per-use $0.005/post read, Enterprise ~$42K/mo) — uneconomical
at our price point. Our channels, all user-initiated or opt-in:

| Signal | Legal channel | Phase |
|---|---|---|
| LinkedIn profile capture | Extension reads the DOM the user is viewing — user-initiated, single profile, no automation (the one-click LinkedIn-capture pattern) | v1.1 |
| LinkedIn network bulk import | User's own LinkedIn data export — Connections CSV (name, company, position, connected date, sometimes email) | v1.1 |
| Device / phone contacts bulk import | User's own exported .vcf file (iPhone/iCloud, Android, Google Contacts all export vCard) — one file, parsed 100% in-browser, nothing scraped | v1.1 |
| Google / Outlook contacts OAuth import | User connects their own Google or Microsoft account (People API `contacts.readonly` / Graph `Contacts.Read`, delegated, explicit consent) — reads only that user's own contacts, on demand, never automated. No Apple/iCloud equivalent (no contacts API) | v1.1 |
| On-device contacts import (mobile) | expo-contacts, OS permission-gated, user selects which to import — the phone's own address book | v1.1 |
| Job-change detection | Diff of re-imported Connections CSV + news-watchlist hits; email-signature changes once email sync exists. Days-to-weeks latency, partial coverage — accepted trade-off | v1.2 |
| "In the news" alerts | Opt-in per-contact watchlist (user stars contacts), nightly/weekly Batch API web search, capped per tier | v1.2 |
| X/Twitter capture | Extension capture of the viewed profile + user-triggered enrichment (web search reaches public X presence); no API monitoring | v1.1 |
| Ambient auto-capture | Email/calendar OAuth (Gmail/Outlook) — the only ToS-clean *continuous* channel; explicit opt-in | v1.4 |
| Relationship strength | Computed from the user's own graph (interaction recency/frequency, notes, events) — no external data at all | v1.2 |

Two 2026-07 additions keep the LinkedIn-export path from stalling: a **Get contacts from LinkedIn**
button opens LinkedIn's own data-export page and starts a day-1/3/6/7 email nudge to upload the
`Connections.csv` once it arrives (email-configured instances only; stops as soon as it's imported
or after a week), and the first-run onboarding walkthrough now routes new users to the import page.
The on-LinkedIn export steps stay as in-app instructions — we can't guide the user on LinkedIn's own
site (cross-origin).

Hard lines: **no scraping, no session piggybacking, no bulk lookup of people who never consented,
no SMS/call-log ingestion** (blocked by iOS entirely and by Play Store policy anyway). This is the
privacy moat stated as engineering policy — the marketing claim is "one click, one file, nothing
scraped behind your back," not "automatic."

### 6.8 Personal MCP server (v1.4 ecosystem — built 2026-08-02)

Any client that speaks the **Model Context Protocol** — claude.ai, Claude Desktop/Code, ChatGPT,
Cursor — connects to `/api/mcp` and works the user's own graph on their behalf. Built on
`mcp-handler` v2 + `@modelcontextprotocol/server` v2, serving the 2026-07-28 MCP spec with a
stateless fallback for 2025-era clients.

- **Two credentials, one endpoint.** Dhaga is its own **OAuth 2.1 authorization server** (better-auth's `mcp` plugin, RFC 8414 + RFC 9728 discovery documents), so a hosted client adds it as a one-click connector behind a normal login and consent screen; local and self-hosted clients instead send the **`x-api-key` personal access token** that already exists for the mobile app. No per-client integration is shipped — the tool list, schemas and descriptions are discovered at connect time.
- **Ten tools — six read, four additive write.** Read: hybrid keyword+semantic search returning the snippets that matched, contact listing, one contact in full (facts carrying their `source_note_id` receipt), open follow-ups, warm paths, upcoming important dates. Write: add a note, create a contact, open a follow-up, close one. **Every write is an explicit tool call that leaves a source receipt — never a silent graph mutation**, so a note an assistant attached is deletable, and the facts derived from it are tombstoned with it, exactly like one typed in the app.
- **No destructive tool exists, deliberately.** No delete, merge, bulk action, export or admin surface. A confused or prompt-injected client must not be able to trigger the deletion cascade (contact → notes → facts → edges → embeddings) that §7.5 makes complete on purpose.
- **Reads cost zero AI credits**, because there is deliberately no "ask" tool: the connected client is already a model, so it gets raw retrieval with receipts and reasons itself. Only a note charges — it queues the same background extraction a note typed in the app does (1 credit, §8.3), and an account out of credits still keeps the note.
- **Pure AGPL core.** Nothing here imports `packages/ee`, so a self-hosted instance serves the identical endpoint (§8.1, `docs/SELF_HOSTING.md`).

Open: the 2026-07-28 spec deprecates Dynamic Client Registration in favour of **Client ID Metadata
Documents (CIMD)**. better-auth 1.6 implements DCR — live, and what today's clients use — but does
not advertise CIMD yet, so that lands when better-auth ships it.

---

## 7. Technical Architecture

### 7.1 Principles

1. **Local-first.** The phone is the source of truth. Everything works offline; cloud is sync + heavy compute, not a dependency.
2. **On-device wherever a free primitive exists** (OCR, transcription, embeddings). Cloud LLM only where it adds unique value (extraction, search reasoning, drafting).
3. **Tiered inference.** Cheapest capable model per task; batch wherever latency doesn't matter; cache everything cacheable.
4. **Boring storage.** Relational tables + vector column. No exotic infra until the graph demands it.

### 7.2 System diagram

```
┌──────────── Mobile App (React Native + Expo, iOS + Android) ────────────┐
│  Camera → Vision/ML Kit OCR → contact parser                           │
│  Mic → whisper.cpp transcription                                       │
│  SQLite (source of truth): contacts/events/notes/facts/edges/vectors │
│  sqlite-vec for on-device semantic search                              │
│  Sync engine (field-level LWW) ────────────────────┐                    │
└─────────────────────────────────────────────────── │ ──────────────────┘
                                                     │ E2E-encrypted sync
┌───────── Web App + Browser Extension (shared TS core) ─┐               │
│  Quick-add: paste email sig / article / LinkedIn URL   │               │
│  Extension popup = same quick-add panel + page context │──────────────▶│
│  Full graph browsing & NL search on desktop            │  ingestion API│
└─────────────────────────────────────────────────────────┘              ▼
┌──────────────── Cloud (optional, hosted or self-hosted) ────────────────┐
│  API: Next.js (Vercel) or Node/Fastify — auth, sync, ingestion, billing│
│  Postgres + pgvector (Supabase/Neon/self-hosted): graph + team graph   │
│  Job queue: nightly Batch-API enrichment/change detection, digests     │
│  LLM gateway: routes tasks → model tier, BYO-key support, metering     │
└──────────────────────────────────────────────────────────────────────────┘
```

**Note on web/extension capture:** these surfaces have no on-device OCR/transcription needs — their inputs are already text (pasted emails, page DOM, URLs). Ingestion is one structured-extraction LLM call against the same schema the mobile parser uses, so all capture surfaces converge on identical graph writes. The extension reads only the active tab on explicit user click (no background scraping — both a privacy stance and a Chrome Web Store review necessity).

### 7.3 Stack choices (opinionated)

| Layer | Choice | Rationale |
|---|---|---|
| Mobile | **React Native + Expo** | One codebase for iOS+Android; native modules for Vision/ML Kit/whisper.cpp exist; largest OSS contributor pool |
| On-device DB | **SQLite (op-sqlite) + sqlite-vec** | Offline-first, vector search on device, trivially exportable (the user's data is literally one file) |
| Cloud DB | **Postgres + pgvector** | One database for relational graph + vectors; Supabase/Neon for hosted, `docker compose` for self-host |
| Backend | **TypeScript (Next.js API routes or Fastify)** | Shares types with the app; deploys to Vercel or a single container |
| Sync | Field-level LWW with per-device vector clocks, or adopt a sync engine — lead candidate as of 2026-07: **TanStack DB + ElectricSQL** (see §11 Q2, `docs/LIBRARIES.md` §5) | Adopt before building; sync is a rabbit hole |
| Client data/UI libraries | **TanStack Query / TanStack Table / nuqs behind app-owned gateways** (`docs/LIBRARIES.md`) | Library-first policy; each vendor import is confined to one adapter file, so swapping to another library or back to custom code is a one-file rewrite |
| Transcription | **Dhaga Voice (Moonshine tiny, on-device WebGPU) on web; whisper.cpp / Apple Speech on mobile** | Free, on-device, private (web: WebGPU-required, no fallback) |
| Embeddings | **nomic-embed-text / bge-small** (on-device or self-hosted) | Free at our scale; no per-call vendor cost |
| LLM | **Claude Haiku 4.5** for extraction/parsing; **Claude Sonnet 5** for search reasoning & drafts; Batch API for nightly jobs | See cost model §9; structured outputs guarantee parseable JSON |
| Self-host inference option | **Ollama / vLLM adapter** (Qwen/Gemma-class models) | The LLM gateway is provider-agnostic; self-hosters and privacy-maximalists plug in local models |

### 7.4 Data model (core tables)

```
contacts(id, name, title, company_id, emails[], phones[], source, created_at, ...)
companies(id, name, domain, sector, enrichment_json)
events(id, name, started_at, ended_at, geohash, calendar_event_id)
event_contacts(event_id, contact_id, scanned_at)
notes(id, contact_id, kind: voice|text, transcript, audio_path, created_at)
facts(id, contact_id, type, text, confidence, source_note_id, created_at, deleted_at)
edges(id, src_type, src_id, predicate, dst_type, dst_id, source_note_id, created_at)
embeddings(owner_type, owner_id, vector)          -- notes + facts + contact summaries
follow_ups(id, contact_id, action, due_at, status)
```

The graph is `edges`; the audit trail is `source_note_id` on facts/edges. Deleting a note cascades tombstones to derived facts — critical for trust and GDPR.

### 7.5 Privacy & compliance (non-functional requirements)

- On-device processing by default; cloud calls are opt-in and per-feature.
- E2E-encrypted sync (user-held key); the hosted service cannot read graph contents.
- Enrichment is user-triggered per contact, not automatic mass-lookup (GDPR legitimate-interest posture; contacts are data subjects who never consented).
- One-tap "forget this person" — cascades contact, notes, facts, edges, embeddings, backups.
- Data export: full SQLite file + CSV/vCard/JSON at any time. No lock-in is a feature *and* the open-source promise.

### 7.6 Web performance (non-functional requirements)

- Fonts and any decorative/non-critical animation ship self-hosted (`next/font/local`/`next/font/google`) and stay off the critical render path (e.g. lazy client-only components via `next/dynamic({ ssr: false })`) — first paint never blocks on an external font or animation download.
- Authenticated `/app/*` navigation (nav switches, contact/event detail) must not re-run the full set of Postgres queries on every click. Add a caching layer (e.g. `unstable_cache`/`revalidateTag`, or React `cache()`) scoped per-user and invalidated on mutation — never a raw TTL alone, since these routes are RLS-scoped per-tenant data and a stale/leaked cache entry is a privacy bug, not just a UX one. **Implemented so far:** the `cachePerUser` helper (`apps/web/src/lib/cache/`) caches the app shell + stable per-user config; the hot volatile reads (home feed, `/api/graph/full`, contact/event lists), plus read replicas and rate-limiting, are the open read-scale levers — tracked honestly in [SCALING.md](SCALING.md).

---

## 8. Open-Source & Sustainability Strategy

### 8.1 Model: Open-core (the Cal.com / Supabase playbook)

| Component | License | Why |
|---|---|---|
| Mobile app, sync server, graph engine, extraction prompts/schemas | **AGPL-3.0** | Fully usable self-hosted; AGPL prevents a hosted competitor from free-riding |
| Cloud-only modules: multi-tenant isolation, early access, billing, admin | **Source-available, noncompete (`packages/ee`, PolyForm Shield 1.0.0)** | The revenue moat; standard open-core separation |
| Schemas, prompt library, eval sets | **MIT** | Maximize community contribution where contribution helps most |

**Implementation status (2026-07):** this split is built, not just planned.
Real accounts, capture, notes, graph, search, and export are AGPL core and
run fully self-hosted with zero `packages/ee` dependency (see
[SELF_HOSTING.md](SELF_HOSTING.md)). Multi-tenancy (Postgres RLS), the
early-access gate, the admin panel, and Stripe billing live in
`packages/ee`, gated behind a single `DHAGA_HOSTED_MODE` flag that self-hosted
instances simply never set. Team graph/SSO (§5.2 v2.0) will land in the same
module once built.

**Why open source helps rather than hurts here:**
1. **Trust is the product.** A private-network app asking for your contacts, location, and voice notes needs verifiable privacy claims. "Read the code, run it yourself" is the strongest possible answer.
2. **Capture edge-cases are a long tail** (card layouts, languages, badge formats). Community PRs handle the tail no small team can.
3. **Self-hosters are marketing, not lost revenue.** The people who run `docker compose up` were never going to pay; their GitHub stars bring the people who will.

### 8.2 Managing LLM cost — the four-layer defense

LLMs are the main marginal cost. Verified current pricing (Anthropic, mid-2026): Haiku 4.5 at **$1 / $5 per MTok** (in/out), Sonnet 5 at $3/$15, **Batch API −50%**, prompt-cache reads at **~0.1×** input price.

| Layer | Mechanism | Effect |
|---|---|---|
| 1. Don't call an LLM | OCR, transcription, embeddings, grouping, graph traversal all on-device/free | ~70% of user actions cost $0 |
| 2. Smallest capable model | Haiku-class for extraction/parsing (they're classification-shaped tasks) | 5–25× cheaper than frontier models |
| 3. Batch + cache | Nightly jobs via Batch API (−50%); shared system prompts marked cacheable (reads ~0.1×) | Halves background-job cost. **The caching half is not live** — our system prompts are hundreds of tokens, under every model's minimum cacheable prefix, so zero cached tokens were observed in §8.3's measurements |
| 4. BYO key / local model | Power users plug in their own API key or Ollama endpoint through the provider-agnostic gateway | Their usage costs us $0 |

### 8.3 Unit economics (measured 2026-07-30)

These are **measured**, not modelled: 39 real API calls against production
prompts, n=3 per action, at Haiku 4.5 $1/$5 per MTok, Sonnet 5 $3/$15, and
Anthropic server-side web search $10/1k. Card scan uses the 1024px downscale the
client actually uploads.

| User action | Model calls | Models | in / out tokens | Cost |
|---|---|---|---|---|
| Card/badge scan (fields + verbatim transcription) | 2 | Haiku ×2 | 2,931 / 258 | **$0.0042** |
| Quick-add parse (pasted text → contact) | 1 | Haiku | 1,549 / 129 | **$0.0022** |
| Note processing (facts, relationships, follow-ups) | 1 | Haiku | 2,471 / 660 | **$0.0058** |
| Ask Dhaga (query plan + reasoned answer) | 2 | Haiku + Sonnet | 1,519 / 431 | **$0.0092** |
| Follow-up draft | 1 | Sonnet | 383 / 222 | **$0.0045** |
| Pre-meeting brief | 1 | Sonnet | 543 / 375 | **$0.0073** |
| Deep research / enrichment (web search + synthesis + extraction) | 2 | Sonnet + Haiku | 2,947 / 2,571 (+36k cached, 2.3 searches) | **$0.0975** |
| Watchlist change scan, per contact per cycle | 1 | Haiku, Batch API | 1,090 / 117 | **$0.0008** |

Three corrections to the earlier order-of-magnitude estimates, all of which
this table supersedes:

1. **NL search costs ~2× the old $0.005 estimate**, because the prompt-cache
   discount it assumed does not happen. Every Dhaga system prompt is a few
   hundred tokens, far under the minimum cacheable prefix (Haiku 4.5: 4,096
   tokens; Sonnet 5: 1,024), so the `cache_control` breakpoint in
   `packages/core/src/llm/anthropic-client/shared.ts` produced **zero** cached
   tokens in 33 of 33 non-web-search calls. Layer 3 of §8.2's defense is not
   live for our own prompts today. Do not model a cached-system discount.
2. **Deep research is the whole cost story**, at ~23× a card scan and 95% of it
   in one call. Most of that is not our tokens: it is 1–3 server-side web
   searches at $0.01 each plus the search tool loop's own cached context. It is
   the only action whose price is set by someone else's meter.
3. **Client-side downscaling is worth real money.** Sending the raw camera file
   instead of the 1024px/q80 downscale costs 838 more input tokens and 17% more
   per scan, with no measured accuracy gain — see `CARD_SCAN_MAX_DIMENSION`.

The old heavy-user profile (100 cards + 100 notes + 200 searches/month) measures
at **$2.84/month**, above the $1.50–2.50 previously claimed — searches, not
cards, are the driver.

**Credits.** Usage is sold in credits, charged per user-visible **action**, not
per model call: one card scan is one credit whether it takes one round-trip or
three. One credit ≜ one card scan ≈ $0.0042; everything else is a whole
multiple rounded up (`packages/core/src/metering/credits.ts`):

| Action | Credits | Why |
|---|---:|---|
| Card scan · quick add · note · follow-up draft | 1 | All within ~1.4× of the anchor |
| Ask Dhaga · pre-meeting brief | 2 | Sonnet reasoning over retrieved context |
| Deep research | 20 | Web search billed on top of tokens |
| Watchlist change scan | 0 | Throttled by the watch limit, not by credits — billing it would eat ~125 credits/month for ~$0.10 of Batch inference |

**Plan sizing.** At a blended ceiling of ~$0.006 of inference per credit, and
taking the worst month a user could physically spend an allowance on (all
notes, the priciest credit):

| Plan | Price | Credits | Worst-case inference | Typical mix | Gross margin |
|---|---|---:|---|---|---|
| Free | $0 | 10 | $0.06 | ~$0.05 | — (a taster we fund) |
| Pro | $8/mo | 300 | $1.73 | ~$1.35 | **72–76%** |
| Power | $24/mo | 1,000 | $5.77 | ~$4.50 | **71–77%** |

(The table uses annual-plan monthly equivalents for unit economics. Public
pricing shows Pro at $10 month-to-month or $8/month billed $96 yearly, and the
planned Power tier at $30 month-to-month or $24/month billed $288 yearly. Power
remains sized but not sold; the first 500 Pro seats can request a $79 first
year, shown separately from standard billing.)

(Margins are after Stripe's 2.9% + $0.30; hosting is not included.) A 100-credit
Pro tier would clear ~94% margin but ration the product to a sixth of the heavy
user profile above — 300 is the number that keeps >70% margin *and* covers a
conference month. 1,000 credits for Power only works at ~$24/mo; at $12 it would
be a 42% worst-case margin. Lifetime and self-hosted stay uncapped. The free
tier gets **10 credits** — 10 card scans, or 5 scans plus 5 notes, or 5
Ask-Dhaga questions — which costs at most $0.06 per free user per month (10 ×
the all-notes credit, ~$0.05 on the typical mix). Deep research can never be
spent there: enrichment and pre-meeting briefs stay feature-gated to paid plans
(`PLAN_FEATURES`), and one run is 20 credits anyway. That same 10 is the
instance-wide default where no plan is in play (self-host, billing not running),
and `DHAGA_AI_MONTHLY_CAP` seeds it (also denominated in credits).

*Plan allowances are defined (`PLAN_AI_CREDITS_PER_MONTH`), runtime-editable per
plan by an admin at `/app/admin/ai-credits` (since 2026-07-30), and — since
2026-07-31 — **enforced by default** (`AI_PLAN_CAP_ENFORCEMENT_DEFAULT = true`).
The master switch is still there, but turning it off is now an escape hatch for a
migration or an incident, not a resting state: with it off, paid plans fall back
to the raw billing entitlement (`hasUnlimitedAi`) and everyone else falls to the
instance default. The marketing prerequisite landed first — **the pricing page no
longer sells "no monthly cap"**: as of 2026-07-31 it sells the allowance itself,
in activities rather than credits ("300 credits — 300 card scans, or 150 scans
plus 150 notes, or 15 deep-research runs; about 100 new people a month"), and
states plainly that a conference week can spend a Pro month. The **10-credit free
taster** that copy assumes is now the shipped constant
(`PLAN_AI_CREDITS_PER_MONTH.free = 10`, which `FREE_TIER_AI_CREDITS_PER_MONTH`
derives from so there is one number), admin-editable like any other plan; if the
free number moves, the plan copy in `apps/web/src/utils/constants/landing/pricing/*`
moves with it. Two levers work regardless of that switch: an instance-wide
**promotion** ("everyone gets 1,000 credits this month", self-expiring) and an
additive **grant** ledger for making users whole after a bug. Grants only move
the ceiling — `ai_actions`, the sole record of what cloud AI actually cost, is
never rewritten. Precedence, highest first: per-user override → active promotion
→ plan allowance (only when the switch is on **and** a paid plan is in play) →
the instance default (`instanceDefaultCap()`: the admin-set Free allowance, else
`DHAGA_AI_MONTHLY_CAP`, else `FREE_TIER_AI_CREDITS_PER_MONTH`), with every active
grant added on top of whichever rung won
(`apps/web/src/lib/ai/metering/cap/index.ts`; rung 4 in
`cap/instance-default.ts`). Free users resolve through that instance-default
rung, not the plan ladder, so `DHAGA_AI_MONTHLY_CAP` means the same thing on a
self-host and on an instance that has billing — and it is a **seed**, not an
override: the moment an admin sets a number, the stored one wins and the env var
stops mattering.*

### 8.4 Revenue streams

1. **Pro (individual):** hosted sync + a monthly AI-credit allowance (§8.3 — 300 credits, sold as such on /pricing since 2026-07-31 and enforced by default since the same date) + enrichment + alerts. Monthly, yearly, and a **lifetime tier** — deliberately echoing the incumbent card scanner's proven one-time-purchase psychology.
2. **Teams:** per-seat, shared graph, SSO, admin. The defensible, expanding revenue line.
3. **Self-host support** (later): paid support/SLA for companies running the AGPL stack internally.

### 8.5 Community flywheel

- Public roadmap + good-first-issues on capture parsers and language support.
- Prompt/eval library in the open: contributors improve extraction quality measurably (eval suite gates PRs).
- Plugin interface for capture sources (badge formats, email parsers) and export targets (CRMs) — the integrations surface area becomes community-maintained.

### 8.6 Viral growth loops (built 2026-07)

A private CRM has no inherent network effect — nobody else sees your graph — so
distribution is engineered as three deliberate, privacy-safe loops (build detail
in `docs/checklist.md` §21):

- **Network Wrapped** — a contact-free, proud-to-post share card ("47 people met
  this month", "12 at this event", "strongest cluster: fintech"), computed
  deterministically from the user's own graph (no LLM, no metered cost). Every
  share is a faceless ad; it exposes aggregate counts + category superlatives
  only, never a third party's name. Server-rendered in feed/story/unfurl formats
  and free to all users — it's a growth surface, not a paywalled one.
- **Public graph sandbox** — the landing lets anyone drag/zoom a real-scale
  (21k-node) but entirely synthetic network, loaded only on demand. It turns the
  product's hardest-to-explain value (a living knowledge graph) into a
  screenshot-worthy toy with zero signup friction, reusing the same sigma.js
  renderer the app ships.
- **Two-sided referral** — a free month of Pro for both advocate and referee
  (hosted tier); a valid invite also admits the referee past the early-access
  wall. The one loop that directly compounds paid conversion.

---

## 9. Delivery Plan & Milestones

| Milestone | Scope | Target |
|---|---|---|
| **M0 — Spike** (2–3 wks) | RN app: camera → Vision OCR → Haiku parse → contact saved; prove the capture loop feels magical | Week 3 |
| **M1 — Capture core** (4 wks) | M1+M2+M3 (scan, grouping, voice notes), SQLite schema, export | Week 7 |
| **M2 — Intelligence core** (4 wks) | M4+M5+M6 (extraction, graph, NL search) | Week 11 |
| **M3 — Loop closure** (3 wks) | M7+M8 (follow-up drafts, backup/export), polish, TestFlight beta | Week 14 |
| **Beta** | 50–100 users recruited from one real conference; measure activation (scans day-1) and retention (search usage week-2) | Week 14–20 |
| **v1.0 + OSS launch** | Public repo, self-host docs, Pro tier live | ~Month 6 |
| **v1.1 — Capture everywhere** | Web quick-add + browser extension (shared TS core) + badge scanning + enrichment | ~Month 8 |

**Success metrics (MVP beta):**
- ≥70% of scans require zero manual field correction
- ≥40% of contacts get a voice/text note attached (the graph's fuel)
- ≥30% of weekly-active users run at least one NL search
- Follow-up draft used (copied/sent) for ≥25% of new contacts

## 10. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Capture friction kills retention (the category's graveyard: Evernote Hello, Humin, CamCard) | High | Obsess over scan-to-saved time (<5s); voice-first notes; value visible on first event (auto-grouping + instant search) |
| Business cards decline as a medium | Medium | Cards are the wedge, not the product — badges, QR, email-forwarding capture ship in v1.x; the graph is medium-agnostic |
| GDPR exposure from enrichment | Medium | User-triggered enrichment only, no bulk scraping, full deletion cascade, EU data residency option on hosted tier |
| LLM cost blowout at scale | Low | Four-layer defense (§8.2); per-user AI-action metering from day one |
| Open-source fork by a competitor | Low | AGPL + the moat is the hosted graph/enrichment pipeline and team network effects, not the client code |
| Solo/small-team scope creep | High | MVP list is a contract; anything not M1–M8 goes to the v1.x backlog by default |

## 11. Open Questions

1. Lifetime-tier pricing: $79 vs $99 vs $129? Needs willingness-to-pay testing against the incumbent card scanner's AUD $99.99 anchor and the ~$10/mo enrichment-CRM anchor.
2. Sync build-vs-adopt: PowerSync/ElectricSQL licensing fit with AGPL? Lead candidate as of 2026-07: **TanStack DB 0.6 + ElectricSQL** — SQLite-backed persistence incl. React Native/Expo, incremental Postgres sync, and we already ship Electric's PGlite (`docs/LIBRARIES.md` §5). Before any M8 sync code, run an evaluation covering: sync model vs the planned field-level LWW, offline semantics, RN/Expo maturity, AGPL/licensing fit, and lock-in vs the decided op-sqlite + sqlite-vec store. Ends in a decision doc + sign-off — not silent adoption.
3. ~~Enrichment data sources: which are ToS-safe?~~ **Resolved 2026-07 — see §6.7.** LinkedIn API is partner-gated and closed to CRMs; X API reads are pay-per-use and uneconomical. Channels: user-triggered web search, LinkedIn Connections CSV import + re-import diff, opt-in news watchlist, extension DOM capture. Remaining sub-question: is this enrichment quality enough vs the NFC badge-scanner's claimed 90%?
4. ~~Browser extension and LinkedIn: confirm legal posture.~~ **Resolved 2026-07 — see §6.7.** User-initiated, single-profile DOM read of a page the user is viewing (the one-click LinkedIn-capture pattern) is the posture; shipped in the extension. No automation, no bulk collection.
5. Brand/name: "NetworkPro" is a working title; trademark search needed.

---

*Appendix A — pricing sources: Anthropic API pricing verified 2026-07 (Haiku 4.5 $1/$5 per MTok; Sonnet 5 $3/$15 with intro $2/$10 through Aug 2026; Batch API −50%; prompt-cache reads ~0.1× input, writes 1.25×).*
