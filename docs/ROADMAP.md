# Roadmap

Dhaga is built in the open. This page tracks what's shipped, what's in
progress, and what's next — derived from the full
[build checklist](checklist.md) and the
[business requirements doc](BRD.md), which has the complete rationale behind
each phase. This page is a summary for contributors and prospective
self-hosters; check those two docs for the exact feature-by-feature detail.

Status legend:

- **Shipped** — built, verified (typecheck/lint/build/tests + a manual
  click-through), and live in the codebase.
- **In progress** — code exists and passes automated checks, but is missing
  a manual verification step (a live API key, a physical device, a real
  purchase) or a final polish pass.
- **Planned** — not started.

## MVP: the core loop

The BRD's MVP is one loop: *scan → auto-group by event → voice note → entity
extraction → natural-language search → AI follow-up draft.* The original plan
was to build this mobile-first; in practice the team built the full loop on
the **web app first** (faster iteration, no app-store review cycle), then
started on the native mobile app. So MVP status splits in two:

| # | Feature | Web | Mobile |
|---|---|---|---|
| M1 | Card scan → structured contact | **Shipped** (photo upload → vision parse → edit-before-save) | In progress — camera → on-device OCR → Haiku parse spike is built but not yet verified on a real Android/iPhone |
| M2 | Auto event grouping ("sessions") | **Shipped** (create, rename, merge, active-session default) | Planned — time + location clustering |
| M3 | Voice + text notes | **Shipped** (browser speech-to-text + transcript) | Planned — on-device transcription |
| M4 | Entity extraction (facts, relationships, follow-ups) | **Shipped** | Shares the same backend once mobile capture lands |
| M5 | Knowledge graph v0 | **Shipped** (contact connections, graph browser, tags) | Shares the same backend |
| M6 | Natural-language search | **Shipped** (keyword + semantic + AI answer with receipts) | Shares the same backend |
| M7 | AI follow-up drafts | **Shipped** (draft, edit, copy) — one acceptance check (that every draft cites a note-derived fact) still needs a manual pass with a live API key | Shares the same backend |
| M8 | Local-first storage + export | **Shipped on web** (Postgres, CSV/vCard/JSON export) | Planned — on-device SQLite as source of truth, full offline mode |

Every AI-derived fact carries a receipt back to the note it came from, and
"forget this person" cascades across contacts, notes, facts, edges, and
embeddings — both true today, not aspirational.

## v1.1 — Capture everywhere

| Feature | Status |
|---|---|
| Web quick-add (paste email signature / free text / article) | **Shipped** |
| Browser extension (Chrome/Edge, one-click capture + "save this article to X") | **Shipped** — Chrome Web Store listing is packaged and ready; publishing itself needs a manual reviewer demo account and the one-time developer registration fee |
| LinkedIn Connections CSV import | **Shipped** |
| User-triggered public-web enrichment | **Shipped** |
| Badge scanning | Planned |
| Email-forwarding ingestion | Planned |

## v1.2 — Proactive intelligence

| Feature | Status |
|---|---|
| Keep-in-touch reminders (Home reach-out feed) | **Shipped** |
| Post-event digest email | **Shipped** |
| On-demand pre-meeting brief | **Shipped** (graph-only; not yet calendar-triggered) |
| Job-change detection (web-search based) | In progress — built, needs a manual pass with live API keys |
| Opt-in news watchlist per contact | In progress — built, needs a manual pass with live API keys |
| Relationship-decay ("going quiet") detection | In progress — built, needs a manual click-through |
| Relationship-strength scoring | In progress — built, needs a manual click-through |
| Calendar integration → auto-pushed briefs | Planned |

## v1.3 — Graph power

| Feature | Status |
|---|---|
| Warm-path finding ("who can intro me to X?") | **Shipped** |
| Second-degree ("nearby in your network") suggestions | **Shipped** |
| Relationship timeline view | **Shipped** |
| Watch app / widgets | Planned |

## v1.4 — Ecosystem

| Feature | Status |
|---|---|
| Outbound webhooks | **Shipped** |
| Telegram capture + Q&A bot | **Shipped** |
| Salesforce / HubSpot / Notion sync | Planned |
| WhatsApp capture, LinkedIn QR formats | Planned |
| Gmail/Outlook interaction sync (opt-in) | Planned |

## v2.0 — Teams

Shared org graph, cross-team "who knows whom," SSO, per-seat billing. This is
the primary planned revenue line and hasn't been started — everything shipped
so far is single-user.

## Self-hosting & launch readiness

- The AGPL core (accounts, capture, notes, graph, search, drafts, export,
  Telegram, the extension API) runs fully self-hosted with **zero**
  dependency on the proprietary `packages/ee` module — see
  [SELF_HOSTING.md](SELF_HOSTING.md).
- `docker compose up` — the `Dockerfile` and `compose.yml` exist and look
  complete on read-through, but haven't been run end-to-end yet. Treat as
  in progress until someone confirms a clean run.
- Dhaga Cloud (hosted multi-tenancy, early-access gate, admin panel, Stripe
  billing) is code-complete and passes automated checks but is still
  pre-launch: no live Stripe products, no manual click-through in a browser
  yet, nothing pushed to production.

## Contributing

Good first issues are labeled `good-first-issue` on GitHub — small,
self-contained pieces of the checklist above that don't require a live API
key, a physical device, or deep familiarity with the codebase. If something
in this roadmap interests you and isn't yet labeled, open an issue and ask;
we're happy to scope it down together.
