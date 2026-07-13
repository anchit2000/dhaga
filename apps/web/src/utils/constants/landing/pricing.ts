import type { FaqItem, PricingPlan } from "@/types";

export const PRICING_PLANS: PricingPlan[] = [
  {
    tier: "Free",
    price: "$0",
    per: "forever",
    highlight: false,
    features: [
      "Unlimited on-device capture & notes",
      "25 cloud AI actions / month",
      "Full export, anytime",
      "Self-host everything",
    ],
    cta: "Start free",
  },
  {
    tier: "Annual",
    price: "$79",
    strikePrice: "$99",
    per: "/year, billed annually",
    highlight: true,
    badge: "Founding price — first 500 seats",
    features: [
      "Everything in Pro, all year",
      "All future updates included",
      "Founding-member badge in the repo",
      "Locks in before public launch pricing",
    ],
    cta: "Reserve founding seat",
  },
  {
    tier: "Pro",
    price: "$8",
    per: "per month, billed yearly",
    highlight: false,
    features: [
      "Unlimited AI actions",
      "Enrichment & job-change alerts",
      "Encrypted multi-device sync",
      "Pre-meeting briefs",
    ],
    cta: "Go Pro",
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Is my data private?",
    answer:
      "Cloud AI only ever runs when you trigger it — no background scraping, no silent enrichment, and every AI-derived fact keeps a receipt back to the note it came from so you can verify or delete it. On our hosted tier, your account's data is isolated by Postgres row-level security; if you want the strongest guarantee, self-host the whole stack yourself. And because the code is open source, you don't have to take our word for any of this.",
  },
  {
    question: "What happens if Dhaga shuts down?",
    answer:
      "You lose nothing. The core is AGPL-licensed and self-hostable on your own server today (packaged install coming), and your data exports as CSV, vCard, or a full JSON dump at any time. We designed our own exit to be painless — that's the point of building in the open.",
  },
  {
    question: "iPhone and Android?",
    answer:
      "A native mobile app (one React Native codebase for both) is on the roadmap, not out yet. Today, capture happens through the web app — quick-add by pasting an email or article, card/badge photo scan, voice notes — and a browser extension for one-click capture from any page.",
  },
  {
    question: "Do the people I scan get contacted or scraped?",
    answer:
      "No. Dhaga never messages your contacts and never bulk-scrapes anyone. Enrichment from public sources runs only when you tap it, per contact, and every AI-derived fact shows its source so you can delete anything.",
  },
  {
    question: "How does the AI pricing work?",
    answer:
      "Most of Dhaga runs free on your device — scanning, transcription, grouping, search over your graph. Cloud AI (extraction, drafts, enrichment) is metered: 25 actions/month free, unlimited on Pro and Annual. Power users can plug in their own API key or a local model and pay us nothing for AI.",
  },
  {
    question: "Why annual instead of monthly?",
    answer:
      "We'd rather sell you a year at a fair, fixed price than meter every action and surprise you with a bill after a busy conference month. Subscriptions fund the hosted sync and team features; the annual tier exists for people who'd rather make one pricing decision a year, not twelve. The $79 founding price is capped at 500 seats, then it goes to $99/yr.",
  },
];
