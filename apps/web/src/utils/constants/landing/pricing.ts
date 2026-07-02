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
    tier: "Lifetime",
    price: "$79",
    strikePrice: "$99",
    per: "once. That's it.",
    highlight: true,
    badge: "Founding price — first 500 seats",
    features: [
      "Everything in Pro, forever",
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
      "Yes — structurally, not just contractually. OCR, transcription, and storage run on your device. Sync is end-to-end encrypted, so our servers can't read your graph. And because the code is open source, you don't have to take our word for any of this.",
  },
  {
    question: "What happens if Dhaga shuts down?",
    answer:
      "You lose nothing. The core is AGPL-licensed and self-hostable with one docker compose command, and your data exports as a single SQLite file at any time. We designed our own exit to be painless — that's the point of building in the open.",
  },
  {
    question: "iPhone and Android?",
    answer:
      "Both, from one codebase, at launch. A web app for quick-adds (paste an email or article, link it to a contact) and a browser extension for one-click capture from LinkedIn follow shortly after.",
  },
  {
    question: "Do the people I scan get contacted or scraped?",
    answer:
      "No. Dhaga never messages your contacts and never bulk-scrapes anyone. Enrichment from public sources runs only when you tap it, per contact, and every AI-derived fact shows its source so you can delete anything.",
  },
  {
    question: "How does the AI pricing work?",
    answer:
      "Most of Dhaga runs free on your device — scanning, transcription, grouping, search over your graph. Cloud AI (extraction, drafts, enrichment) is metered: 25 actions/month free, unlimited on Pro and Lifetime. Power users can plug in their own API key or a local model and pay us nothing for AI.",
  },
  {
    question: "Why a lifetime price?",
    answer:
      "Because we also resent renting our own contacts back. Subscriptions fund the hosted sync and team features; the lifetime tier exists for people who want to pay once and own their memory. The $79 founding price is capped at 500 seats, then it goes to $99.",
  },
];
