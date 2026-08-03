/** Home-dashboard constants (the /app landing surface). */

export const HOME_TILE_TONE_CLASSES = {
  default: "border-seam",
  amber: "border-amber/25",
  attention: "border-human/30",
  intelligence: "border-magic/30",
  network: "border-trust/30",
} as const;

export type HomeTileTone = keyof typeof HOME_TILE_TONE_CLASSES;

/**
 * The ceiling on one bento cell. Under a grid with an indefinite height every
 * `1fr` row resolves to the LARGEST base size in the whole grid, so without a
 * cap one nine-row tile pads every two-row tile on Home out to match it —
 * hundreds of pixels of dead space. Clamping the cell clamps that base size (a
 * grid item's content-based contribution is clamped by its max-height), so the
 * one overflowing tile scrolls inside HomeTile instead of stretching every
 * other tile to its height.
 *
 * 28rem is chosen against the tiles, not by feel: a full five-row preview tile
 * lands just under it, so the common case still shows everything and only the
 * genuine outliers scroll.
 *
 * `sm:` only, exactly like `auto-rows-fr`: in the single column nothing sits
 * beside a tile, heights are already natural, and a scroll region nested in the
 * page scroll is the wrong thing to hand a thumb.
 */
export const HOME_TILE_CAP_CLASS = "sm:max-h-[28rem]";

/** The heading id the cadence-due block on /app/follow-ups renders. */
export const DUE_CHECK_INS_ANCHOR = "due";

/**
 * Where Home's "+N more due" footer goes. Derived from the anchor above so the
 * link and the block it targets can never drift apart.
 */
export const DUE_CHECK_INS_HREF = `/app/follow-ups#${DUE_CHECK_INS_ANCHOR}`;

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
