export const FOCUSED_PEOPLE = [
  { id: "sarah", name: "Sarah Chen", detail: "Stripe · Growth", note: "Introduced by Maya" },
  { id: "rohan", name: "Rohan Mehta", detail: "Freight ops · Mumbai", note: "Voice note · yesterday" },
  { id: "priya", name: "Priya Nair", detail: "Meridian Capital", note: "Last message · Monday" },
  { id: "alice", name: "Alice Krejčová", detail: "Onboarding · Berlin", note: "Meeting notes · Jun 12" },
] as const;

export const FOCUSED_CONTEXT = [
  { label: "Meeting note", detail: "Exploring an onboarding partnership", action: "View" },
  { label: "Voice note", detail: "Warm intro to the product team", action: "Play" },
  { label: "Message", detail: "Asked for the API overview", action: "Open" },
] as const;

export const FOCUSED_FAQ = [
  {
    question: "Is Dhaga only for conferences or business cards?",
    answer: "No. Capture context after any meeting, introduction, message, voice note, or card scan. Dhaga keeps the relationship history together.",
  },
  {
    question: "Does Dhaga train on my network?",
    answer: "No. Your relationship data stays private, and every AI-derived fact keeps a link back to its source.",
  },
  {
    question: "Can I leave or self-host?",
    answer: "Yes. Export your data at any time, or run the AGPL-licensed core yourself. The cloud plan adds managed hosting and convenience.",
  },
] as const;
