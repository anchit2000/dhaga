export const CAPTURE_PREVIEW = {
  modes: ["Manual", "Paste text", "Card photo"],
  file: "meridian-card-front.jpg",
  dock: ["Voice", "Camera", "Upload", "Capture"],
} as const;

export const SEARCH_PREVIEW = {
  query: "Who do I know in logistics?",
  steps: ["Understanding your question", "Searching people and notes", "Writing with receipts"],
  answer:
    "Priya Nair is your strongest logistics connection. Your notes place her at Freightline and mention a route-optimisation project.",
  receipts: ["Priya Nair · Freightline", "Rohan Mehta · Freight operations"],
} as const;

export const DRAFT_PREVIEW = {
  body:
    "Sarah — great meeting you at Web Summit. I enjoyed our conversation about onboarding flows. Here is the short demo I promised; I would love to hear what you think.",
} as const;

export const VOICE_PREVIEW = {
  transcript:
    "Rohan runs operations for a freight forwarder and is evaluating route optimisation next quarter.",
} as const;

export const SIGNAL_PREVIEW = {
  kind: "Job change",
  person: "Sarah Chen",
  company: "Stripe",
  headline: "Left Stripe — founding something new",
  detail: "Detected from a watched public source.",
} as const;

export const QUIET_PREVIEW = {
  person: "Alice Krejčová",
  role: "Product lead · Northwind",
  lastTouch: "last touch 8 months ago",
  strength: "Cooling · 22",
} as const;

export const CIRCLE_PREVIEW = {
  eventName: "Web Summit 2026",
  description:
    "You’re at a new place — give this event a name to keep who you meet here together.",
  circles: [
    { name: "Web Summit 2026", count: 12, on: true },
    { name: "Founders", count: 8, on: false },
  ],
} as const;
