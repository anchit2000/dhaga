<img src="apps/web/public/logo.svg" alt="dhaga" width="240" />

# dhaga <sub>धागा · thread</sub>

**Every thread, remembered.**

Dhaga is an open-source, AI-native personal CRM. Scan a card, a badge, or just
talk — every person you meet becomes part of a **private knowledge graph** you
can search in plain language, with every AI-derived fact citing the exact note
it came from.

> *"Who did I meet at Web Summit who mentioned an AI budget?"* → an answer,
> with receipts.

## Why

You met 47 people at your last conference. You followed up with 5. You'll
remember 3 by next quarter. Card-scanner apps digitize the contact and lose the
context; personal CRMs sync your inbox but capture nothing at the moment of
meeting; enterprise relationship platforms cost $2,000+ per seat. Dhaga
captures at the handshake and remembers who they are *to you*.

## Principles

- **Local-first.** Notes, extraction, and search work against your own
  Postgres (embedded PGlite by default, or any hosted Postgres you point it
  at) — no dependency on Dhaga's cloud to function.
- **Private by design.** No scraping, no silent enrichment — every AI call is
  user-triggered and every derived fact keeps a receipt back to the note it
  came from. "Forget this person" cascades everywhere.
- **Leave anytime.** Export your full graph as CSV, vCard, or JSON at any
  time — see [DEPLOYING.md](docs/DEPLOYING.md).
- **Bring your own AI.** Cloud AI (Claude) is optional — without an API key,
  capture falls back to an offline heuristic parser and AI features show a
  clear "not configured" message rather than failing silently.
- **Open-core, not open-crippled.** Everything you need to run Dhaga for
  yourself — accounts, capture, notes, graph, search, drafts, export,
  Telegram, the browser extension API — is AGPL and runs with zero
  dependency on any proprietary code. See [SELF_HOSTING.md](docs/SELF_HOSTING.md).

## Repository layout

```
apps/web/        Next.js — marketing site, the app (/app), API routes
apps/extension/  Browser extension (MV3) — one-click capture
packages/core/   Shared Zod schemas, LLM gateway, extraction prompts
packages/ee/     Dhaga Cloud only — multi-tenancy, billing, admin, early access
                 (source-available, not AGPL — see packages/ee/LICENSE;
                 self-hosting needs none of it, see docs/SELF_HOSTING.md)
apps/mobile/     React Native + Expo — iOS & Android (planned)
docs/BRD.md      Full product requirements, roadmap, competitor analysis
```

## Development

```bash
npm install
npm run dev --workspace=web
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in at least
`BETTER_AUTH_SECRET` (`openssl rand -base64 32`) to run locally. See
[TESTING.md](docs/TESTING.md) for a full manual test pass, and
[SELF_HOSTING.md](docs/SELF_HOSTING.md) / [DEPLOYING.md](docs/DEPLOYING.md) for
running your own instance or Dhaga Cloud's hosted-mode features.

## Status

Pre-launch. The full MVP loop is built — card/badge scan, voice + text
notes, entity extraction, the knowledge graph, natural-language search, AI
follow-up drafts, and export — plus v1.1+ features (web quick-add, browser
extension, Telegram capture, events, reminders) and real multi-user
accounts. Not yet done: mobile app, a verified `docker compose up` (the
`Dockerfile` and `compose.yml` exist but haven't been run yet), and a live-tested
Stripe billing flow for Dhaga Cloud. See [checklist.md](docs/checklist.md) for the
exact feature-by-feature status, [ROADMAP.md](docs/ROADMAP.md) for what's shipped
and what's next, and [BRD.md](docs/BRD.md) for the full product requirements.

## License

[AGPL-3.0](LICENSE) for everything except `packages/ee`, which is
source-available under a separate noncompete license (PolyForm Shield
1.0.0 — see [`packages/ee/LICENSE`](packages/ee/LICENSE)) and powers Dhaga
Cloud's hosted-only features: multi-tenant isolation, early access, the
admin panel, and billing. Self-hosting needs none of it — see
[SELF_HOSTING.md](docs/SELF_HOSTING.md) for exactly what that means and how to
verify it yourself.
