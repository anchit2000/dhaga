import type { AskExample, ComparisonRow, HowItWorksStep } from "@/types";

export const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    step: "STEP 1",
    title: "Capture in five seconds",
    body: "Card, badge, QR, a LinkedIn page, a pasted email — or just talk. OCR and voice transcription run on your phone. Contacts scanned at the same event group themselves automatically.",
  },
  {
    step: "STEP 2",
    title: "The graph builds itself",
    body: "AI reads your notes and extracts who they are, where they work, who they know, and what you promised. Every fact keeps a receipt — tap it to see the exact note it came from.",
  },
  {
    step: "STEP 3",
    title: "Ask, and act",
    body: "Search your network in plain language. Get a follow-up draft that mentions the sailing thing. Get nudged when someone changes jobs — the moment outreach matters most.",
  },
];

export const ASK_EXAMPLES: AskExample[] = [
  {
    query: "who did I meet in Singapore who works in logistics?",
    answerName: "Priya Nair",
    answer: "Head of Ops at Freightline. You met at TechInAsia, Oct 2025.",
    receipt:
      "…runs ops for a freight forwarder, they're evaluating route-optimisation AI next quarter…",
  },
  {
    query: "who used to work at Stripe?",
    answerName: "Sarah Chen",
    answer: "Now founding something new. You met at Web Summit 2026.",
    receipt: "…leaving Stripe in March, interested in our API, two kids, loves sailing.",
  },
];

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: "Captures at the moment of meeting",
    dhaga: "✓ card, badge, QR, voice",
    cardApps: "✓ cards & badges",
    personalCrms: "✗ inbox sync only",
    enterprise: "✗ email mining",
  },
  {
    feature: "Voice-first notes → searchable facts",
    dhaga: "✓ with receipts",
    cardApps: "✗",
    personalCrms: "partial, typed",
    enterprise: "✗",
  },
  {
    feature: "Ask in plain language",
    dhaga: "✓",
    cardApps: "✗",
    personalCrms: "partial",
    enterprise: "✓",
  },
  {
    feature: "Works fully offline",
    dhaga: "✓ local-first",
    cardApps: "✗",
    personalCrms: "✗",
    enterprise: "✗",
  },
  {
    feature: "Open source — read the code",
    dhaga: "✓ AGPL",
    cardApps: "✗",
    personalCrms: "✗",
    enterprise: "✗",
  },
  {
    feature: "Leave anytime with your data",
    dhaga: "✓ one file",
    cardApps: "CSV export",
    personalCrms: "varies",
    enterprise: "contract terms",
  },
  {
    feature: "Price",
    dhaga: "$79 once",
    cardApps: "$6+/mo",
    personalCrms: "$10–18/mo",
    enterprise: "$2,000+/seat/yr",
  },
];

export const COMPARISON_COLUMNS = [
  "",
  "Dhaga",
  "Card apps (Blinq, HiHello)",
  "Personal CRMs (Mesh, Dex)",
  "Enterprise (Affinity)",
] as const;

export const OSS_PILLARS = [
  { bold: "AGPL-licensed core.", rest: " The app, the sync server, the graph engine — public on GitHub." },
  { bold: "Your data is one SQLite file.", rest: " On your phone. Export it, back it up, walk away anytime." },
  { bold: "End-to-end encrypted sync.", rest: " Our hosted service can't read your graph. By design, not policy." },
  { bold: "Bring your own AI.", rest: " Use our cloud, your API key, or a local model via Ollama." },
] as const;
