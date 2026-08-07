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
    "Cloud AI runs on a monthly allowance of credits. One credit is one card scan, pasted email signature, note turned into facts, or drafted follow-up. Asking your network a question or getting a pre-meeting brief costs 2; deep research costs 20. Free accounts get 10 credits a month and Pro gets 300. Power will include 1,000 credits when it launches. Everything that isn't cloud AI — contacts, notes, facts, follow-ups, keyword search, event grouping, on-device voice transcription, and export — is unlimited on every plan. Self-hosters can use their own API key or local model.",
};

const CREDITS_RUN_OUT_FAQ: FaqItem = {
  question: "What happens when I run out of credits?",
  answer:
    "Nothing breaks and nothing is billed. Contacts and notes still save, keyword search and event grouping still work, and export still works — those never used credits. The AI parts pause: a note is kept but not turned into facts until the reset, card scanning stops (you can still add the person by hand), and asking your network a question falls back to keyword matches instead of a reasoned answer. Credits reset on the 1st of each month. They don't roll over, and there is no overage charge — the allowance is a ceiling, not a meter.",
};

// Quoted in dollars because that is the sizing the rest of the copy uses, with
// the charging currency stated outright — the /pricing toggle can render these
// same plans in either currency, and only one of them is what a card is
// actually debited. Same honesty rule as CurrencyToggle's caveat.
const BILLING_FAQ: FaqItem = {
  question: "How do monthly and yearly billing compare?",
  answer:
    "Choose monthly for flexibility: Pro is $10/month and Power will be $30/month. Yearly billing saves 20%: Pro is $96/year ($8/month, saving $24) and Power will be $288/year ($24/month, saving $72). Payments are taken in rupees through Razorpay today, so those dollar figures are an approximate conversion and checkout shows the ₹ amount. Power is not available yet, so joining its waitlist does not start a subscription.",
};

// The renewal sentence is the decision recorded in BRD §11 Q6, and it is
// deliberately bounded by "while your subscription is active": a Razorpay Plan
// charges the same amount every cycle, so nothing steps the price up — but
// whether someone who CANCELS can come back to the founding price later is not
// decided by any code today, so this claims nothing about it.
const FOUNDING_FAQ: FaqItem = {
  question: "What is the founding Pro offer?",
  answer:
    "The first 500 Pro seats can buy a year of Pro for ₹6,999 instead of ₹8,499 — and it stays ₹6,999 at every renewal for as long as the subscription is active, rather than stepping up to the standard price after the first year. It is billed in rupees through Razorpay — the only currency it is sold in — and it is claimed at checkout, not switched onto later: once the 500 seats are gone the offer disappears and standard Pro is what remains. Shown separately so it is never confused with normal monthly or yearly billing.",
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
      "A native mobile app (one React Native codebase for both) is on the roadmap, not out yet. Today, capture happens through the web app — quick-add by pasting an email or article, card/badge photo scan, voice notes — free on every plan. There is also a browser extension for one-click capture from any page: it is built and free, but it is not in the Chrome Web Store yet, so for now you load it unpacked from the repo. You can also capture from your phone with nothing installed: forward a contact card, note, or photo to the Dhaga bot on WhatsApp or Telegram and reply DONE (voice notes to the bot are coming soon). Connecting a chat to the bot is part of Pro and Power.",
  },
  {
    question: "Do the people I scan get contacted or scraped?",
    answer:
      "No. Dhaga never messages your contacts and never bulk-scrapes anyone. Enrichment from public sources runs only when you tap it, per contact, and every AI-derived fact shows its source so you can delete anything.",
  },
  AI_PRICING_FAQ,
  BILLING_FAQ,
];

/** The /pricing page FAQ — the money questions, ordered for a buyer. */
export const PRICING_FAQ_ITEMS: FaqItem[] = [
  AI_PRICING_FAQ,
  {
    question: "What exactly do I get for free?",
    answer:
      "Unlimited contacts, notes, facts and follow-ups, the full CRM used manually, on-device voice transcription, keyword search and event grouping over your graph, full export at any time, and the right to self-host everything — none of that is metered, on any plan. On top of it, 10 AI credits a month: about 10 business cards scanned, or 5 cards plus 5 notes turned into facts, or 5 questions asked of your network. Enough to judge whether the AI earns its keep on your own contacts. The browser extension is free too — it signs in with the session you're already logged into, no token needed — though it is not in the Chrome Web Store yet, so today you load it unpacked from the repo. Pre-meeting briefs, enrichment, MCP clients, connecting a WhatsApp or Telegram chat, and the API tokens the mobile app and your scripts use stay on the paid plans.",
  },
  CREDITS_RUN_OUT_FAQ,
  BILLING_FAQ,
  FOUNDING_FAQ,
  {
    question: "Can I self-host and pay nothing?",
    answer:
      "Yes. The core is AGPL-licensed and runs without any of the cloud-only code, so you can host the whole stack yourself. Self-hosters can also plug in their own Anthropic API key or a local model and re-enable AI on the free tier with the DHAGA_AI_MONTHLY_CAP setting — you pay your model provider, not us. The paid tiers buy hosted sync and the enrichment and alerting we run for you.",
  },
  SHUTDOWN_FAQ,
];
