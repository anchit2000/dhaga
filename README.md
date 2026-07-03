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

- **Local-first.** Your phone is the source of truth. OCR, transcription, and
  search run on-device. Works fully offline.
- **Private by design.** End-to-end encrypted sync — our servers can't read
  your graph. No scraping, no silent enrichment. Every fact keeps a receipt.
- **Leave anytime.** Your data exports as a single SQLite file. Self-host the
  whole stack with `docker compose up`.
- **Bring your own AI.** Our cloud, your API key, or a local model via Ollama.

## Repository layout

```
apps/web/        Next.js — marketing site, web quick-add, graph browser (in progress)
apps/mobile/     React Native + Expo — iOS & Android (planned)
apps/extension/  Browser extension — one-click capture (planned)
packages/core/   Shared Zod schemas, extraction prompts, API client (planned)
BRD.md           Full product requirements, roadmap, competitor analysis
```

## Development

```bash
cd apps/web
npm install
npm run dev
```

## Status

Pre-alpha. The landing page is live; the MVP capture loop
(scan → auto-group → voice note → extraction → search → follow-up draft) is
being built next. See [BRD.md](BRD.md) for the milestone plan.

## License

[AGPL-3.0](LICENSE). The core is and will remain free software — usable,
self-hostable, and forkable. Hosted-cloud modules (team graph, managed
enrichment, billing) may live under a separate commercial license as the
project grows, following the standard open-core model.
