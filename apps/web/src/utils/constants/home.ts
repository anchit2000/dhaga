/** Home-dashboard constants (the /app landing surface). */

/**
 * The most DB round-trips one Home render may cost.
 *
 * Not a style rule — a connection-pressure ceiling. An RSC render pins ONE
 * tenant connection for the whole request (lib/db/request-scope.ts) and
 * node-postgres serializes queries on a client, so Home's reads are strictly
 * sequential no matter how they are grouped, and each one lengthens the hold on
 * one of the three slots in the tenant pool (packages/ee/src/db/pool.ts). The
 * number is the measured cost of the collapsed path (batched settings + a single
 * goal-cohort load) with a small allowance for data-dependent reads; the guard
 * that enforces it is lib/__tests__/home-connection-pressure.test.ts.
 */
export const HOME_DB_ROUND_TRIP_BUDGET = 19;

/**
 * How many of those may hit the key/value `settings` table. Three, and each is a
 * DIFFERENT feature's row set: the batched suggestion scalars (schedule prefs +
 * daily count + important-date lead days, one query — lib/repo/suggestion-settings/bundle.ts),
 * the dismissed name-clusters list, and the goal-match batch pointer. A fourth
 * means a key is being fetched on its own round-trip that could have ridden the
 * batch — the exact regression the collapse removed.
 */
export const HOME_SETTINGS_ROUND_TRIP_BUDGET = 3;

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
