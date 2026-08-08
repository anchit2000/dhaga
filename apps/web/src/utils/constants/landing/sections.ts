import type { AskExample, ComparisonRow, HowItWorksStep } from "@/types";

export const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    step: "STEP 1",
    title: "Capture in five seconds",
    body: "Card, badge, QR, a LinkedIn page, a pasted email, or a contact forwarded to WhatsApp or Telegram — or just talk. Voice transcription runs on-device, free; photos get a fast AI read. Contacts scanned at the same event group themselves automatically.",
  },
  {
    step: "STEP 2",
    title: "The graph builds itself",
    body: "AI reads your notes and extracts who they are, where they work, who they know, and what you promised. Every fact keeps a receipt — tap it to see the exact note it came from.",
  },
  {
    step: "STEP 3",
    title: "Ask, and act",
    // "Get nudged when someone changes jobs" used to sit here. Job-change and
    // news nudges come from the nightly signal-detection job, which needs a
    // configured web-search provider and no-ops without one — so no user is
    // nudged about a job change today. The reasons named below are the ones the
    // Home scorer actually ranks on (SUGGESTION_WEIGHTS in
    // @/utils/constants/suggestions): cadence, follow-up, important date, goal.
    body: "Search your network in plain language. Get a follow-up draft that mentions the sailing thing. Get nudged when a reach-out cadence comes due, a promise you made falls past its date, or someone's birthday lands. Home opens on a short briefing of who's worth a message today, aimed by whatever goal you've set.",
  },
];

/**
 * The daily loop shown on /features: the Home briefing, the goal that aims it,
 * and the address-book noise it keeps out. Deliberately NOT part of STORY_STEPS
 * — that array's `id` is a `StoryVisual` and every member needs a matching
 * device visual in components/landing/FeatureStory. These are plain cards.
 *
 * Wording is load-bearing on the third card: filtered contacts are never
 * suggested but always findable. Nothing here may imply deletion or hiding.
 */
export const DAILY_LOOP_STEPS = [
  {
    kicker: "Today",
    title: "A briefing, not an inbox.",
    // "a job change" was in this list too; same reason as STEP 3 above — the
    // signal term exists in the scorer but nothing populates it while the
    // nightly signal job has no web-search provider to run on.
    body: "Home leads with a handful of people worth a message today — a cadence that came due, a promise you made, an occasion, a relationship going quiet. Mark one reached out and it leaves the list.",
  },
  {
    kicker: "Goals",
    title: "Say what you're working on.",
    body: "“Reach out to VCs.” “Reconnect with people from the Delhi trip.” Dhaga resolves the sentence into a finite cohort from your own graph, surfaces a few each day, and burns the list down as you contact them. One goal at a time, so it actually finishes.",
  },
  {
    kicker: "Quiet contacts",
    title: "Your plumber stays out of it.",
    body: "Import a whole phone book and Dhaga works out which rows are people you'd reach out to. “Vegetable Vendor” and “Ola Support” are never suggested — and never lost: still in People, still searchable, still in every export. A “hidden from suggestions” link shows exactly who, and one tap overrules it.",
  },
] as const;

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
    dhaga: "✓ card, badge, QR, voice, chat",
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
    feature: "Self-host it — your data, your server",
    dhaga: "✓ local-first core",
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
    // The standard Pro year, not the founding price: that one is a capped,
    // INR-only offer (see pricing/plans.ts) and quoting it here would advertise
    // a dollar figure nothing charges, to visitors who may find it sold out.
    dhaga: "$96/yr",
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
  { bold: "AGPL-licensed core.", rest: " The app, the API, the graph engine — public on GitHub, self-hostable, no phone-home." },
  { bold: "Your data, exportable anytime.", rest: " CSV, vCard, or a full JSON dump of your whole graph — no lock-in, ever." },
  { bold: "Tenant-isolated by database, not just policy.", rest: " Our hosted tier enforces per-account isolation with Postgres row-level security; self-host it yourself for full control." },
  { bold: "Cloud AI is optional.", rest: " Without a key, capture still works via an offline heuristic parser — nothing breaks, nothing's held hostage." },
] as const;
