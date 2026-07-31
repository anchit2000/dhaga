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
    "Cloud AI runs on a monthly allowance of credits. One credit is one card scan, one pasted email signature, one note turned into facts, or one drafted follow-up. Asking your network a question or getting a pre-meeting brief costs 2. Deep research on a person or company — which pays for live web searches — costs 20. The nightly job-change and news watch costs nothing at all, and stays capped at 25 watched contacts on every plan. Free accounts get 10 credits a month; Pro and the founding Annual plan get 300, which comfortably covers about 100 new people a month, each scanned, noted, and asked about. Everything that isn't cloud AI — contacts, notes, facts, follow-ups, keyword search, event grouping, on-device voice transcription, export — is unlimited on every plan, free ones included. Self-hosters can plug in their own API key or a local model and pay us nothing for AI.",
};

const CREDITS_RUN_OUT_FAQ: FaqItem = {
  question: "What happens when I run out of credits?",
  answer:
    "Nothing breaks and nothing is billed. Contacts and notes still save, keyword search and event grouping still work, and export still works — those never used credits. The AI parts pause: a note is kept but not turned into facts until the reset, card scanning stops (you can still add the person by hand), and asking your network a question falls back to keyword matches instead of a reasoned answer. Credits reset on the 1st of each month. They don't roll over, and there is no overage charge — the allowance is a ceiling, not a meter.",
};

const ANNUAL_FAQ: FaqItem = {
  question: "Why annual instead of monthly?",
  answer:
    "We'd rather sell you a year at a fair, fixed price than bill you per action and surprise you after a busy conference month. Credits are an allowance, not a meter: they never turn into a bill. Be aware of the flip side, though — a heavy conference month can outrun 300 credits. Scanning and noting 150 badges in a week spends the whole month, and AI then waits for the 1st. The $79 founding price is capped at 500 seats, then it goes to $99/yr.",
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
      "A native mobile app (one React Native codebase for both) is on the roadmap, not out yet. Today, capture happens through the web app — quick-add by pasting an email or article, card/badge photo scan, voice notes — and a browser extension for one-click capture from any page. You can also capture from your phone with nothing installed: forward a contact card, note, or photo to the Dhaga bot on WhatsApp or Telegram and reply DONE (voice notes to the bot are coming soon).",
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
      "Unlimited contacts, notes, facts and follow-ups, the full CRM used manually, on-device voice transcription, keyword search and event grouping over your graph, full export at any time, and the right to self-host everything — none of that is metered, on any plan. On top of it, 10 AI credits a month: about 10 business cards scanned, or 5 cards plus 5 notes turned into facts, or 5 questions asked of your network. Enough to judge whether the AI earns its keep on your own contacts. Pre-meeting briefs, enrichment and encrypted multi-device sync stay on the paid plans.",
  },
  CREDITS_RUN_OUT_FAQ,
  ANNUAL_FAQ,
  {
    question: "Can I self-host and pay nothing?",
    answer:
      "Yes. The core is AGPL-licensed and runs without any of the cloud-only code, so you can host the whole stack yourself. Self-hosters can also plug in their own Anthropic API key or a local model and re-enable AI on the free tier with the DHAGA_AI_MONTHLY_CAP setting — you pay your model provider, not us. The paid tiers buy hosted sync and the enrichment and alerting we run for you.",
  },
  SHUTDOWN_FAQ,
];
