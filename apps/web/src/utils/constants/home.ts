/** Home-dashboard constants (the /app landing surface). */

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
