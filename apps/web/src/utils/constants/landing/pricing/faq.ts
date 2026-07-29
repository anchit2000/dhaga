import type { FaqItem } from "@/types";

// The three entries the landing FAQ and the /pricing FAQ both need. Named here
// so the copy has exactly one home — both arrays below reference them.
const SHUTDOWN_FAQ: FaqItem = {
  question: "What happens if Dhaga shuts down?",
  answer:
    "You lose nothing. The core is AGPL-licensed and self-hostable on your own server today (packaged install coming), and your data exports as CSV, vCard, or a full JSON dump at any time. We designed our own exit to be painless — that's the point of building in the open.",
};

const AI_PRICING_FAQ: FaqItem = {
  question: "How does the AI pricing work?",
  answer:
    "Most of Dhaga is free and unmetered — voice transcription runs on-device (no audio leaves your browser), and event grouping and keyword search over your graph never touch cloud AI. The free tier is fully usable manually, but cloud AI (card reads, note extraction, NL search, drafts, briefs, enrichment) is a paid feature: it starts on Pro at $8/mo, with no monthly cap on Pro and Annual. The one place cost could compound — the job-change/news watchlist — stays capped at 25 contacts per plan regardless of tier. Power users can self-host and plug in their own API key or a local model and pay us nothing for AI.",
};

const ANNUAL_FAQ: FaqItem = {
  question: "Why annual instead of monthly?",
  answer:
    "We'd rather sell you a year at a fair, fixed price than meter every action and surprise you with a bill after a busy conference month. Subscriptions fund the hosted sync and team features; the annual tier exists for people who'd rather make one pricing decision a year, not twelve. The $79 founding price is capped at 500 seats, then it goes to $99/yr.",
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Is my data private?",
    answer:
      "Cloud AI only ever runs when you trigger it — no background scraping, no silent enrichment, and every AI-derived fact keeps a receipt back to the note it came from so you can verify or delete it. On our hosted tier, your account's data is isolated by Postgres row-level security; if you want the strongest guarantee, self-host the whole stack yourself. And because the code is open source, you don't have to take our word for any of this.",
  },
  SHUTDOWN_FAQ,
  {
    question: "iPhone and Android?",
    answer:
      "A native mobile app (one React Native codebase for both) is on the roadmap, not out yet. Today, capture happens through the web app — quick-add by pasting an email or article, card/badge photo scan, voice notes — and a browser extension for one-click capture from any page. You can also capture from your phone with nothing installed: forward a contact card, note, or voice note to the Dhaga bot on WhatsApp or Telegram and reply DONE.",
  },
  {
    question: "Do the people I scan get contacted or scraped?",
    answer:
      "No. Dhaga never messages your contacts and never bulk-scrapes anyone. Enrichment from public sources runs only when you tap it, per contact, and every AI-derived fact shows its source so you can delete anything.",
  },
  AI_PRICING_FAQ,
  ANNUAL_FAQ,
];

/** The /pricing page FAQ — the money questions, ordered for a buyer. */
export const PRICING_FAQ_ITEMS: FaqItem[] = [
  AI_PRICING_FAQ,
  {
    question: "What exactly do I get for free?",
    answer:
      "Unlimited capture and notes, the full CRM used manually, on-device voice transcription, keyword search and event grouping over your graph, full export at any time, and the right to self-host everything. What the free tier does not include is cloud AI — card reads, note extraction, natural-language search, drafts, briefs, and enrichment are a paid feature, so free accounts cost us nothing to run and we never need to meter you.",
  },
  ANNUAL_FAQ,
  {
    question: "Can I self-host and pay nothing?",
    answer:
      "Yes. The core is AGPL-licensed and runs without any of the cloud-only code, so you can host the whole stack yourself. Self-hosters can also plug in their own Anthropic API key or a local model and re-enable AI on the free tier with the DHAGA_AI_MONTHLY_CAP setting — you pay your model provider, not us. The paid tiers buy hosted sync and the enrichment and alerting we run for you.",
  },
  SHUTDOWN_FAQ,
];
