/** Home-dashboard constants (the /app landing surface). */

export const HOME_TILE_TONE_CLASSES = {
  default: "border-seam",
  amber: "border-amber/25",
  attention: "border-human/30",
  intelligence: "border-magic/30",
  network: "border-trust/30",
} as const;

export type HomeTileTone = keyof typeof HOME_TILE_TONE_CLASSES;

export const HOME_STAT_TONE_CLASSES: Record<string, string> = {
  People: "text-trust",
  Companies: "text-calm",
  Notes: "text-magic",
  Facts: "text-magic",
  Relationships: "text-calm",
  Events: "text-trust",
  "Open follow-ups": "text-human",
  Entities: "text-trust",
};

/**
 * The three-step "how it works" strip shown on the first-run empty state,
 * mirroring the product loop: capture people → build a private graph → pull a
 * thread when you need it. Copy only; the OnboardingTour handles the guided
 * walkthrough, this just orients a brand-new account.
 */
export const HOME_EMPTY_STEPS = [
  {
    title: "Capture anyone",
    body: "Scan a card, paste an intro, or speak a note — the details get pulled out for you.",
  },
  {
    title: "Build your graph",
    body: "Every note threads people, companies, and events into one private knowledge graph.",
  },
  {
    title: "Pull the thread",
    body: "Ask in plain English and Dhaga surfaces who to reach out to before it slips.",
  },
] as const;
