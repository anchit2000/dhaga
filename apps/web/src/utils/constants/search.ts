/**
 * Hybrid search scoring weights — heuristic, not scientifically tuned.
 * Each source's score is `ts_rank(...) * weight` (or a flat weight for
 * trigram fragment matches, which have no rank), summed per contact across
 * every source that matched. User-tunable from the Search tab's "Tune
 * ranking" panel; persisted per-instance via lib/repo/settings.ts.
 */
export interface SearchWeights {
  semantic: number;
  identity: number;
  trigram: number;
  facts: number;
  notes: number;
  followUps: number;
  events: number;
  signals: number;
}

export const DEFAULT_SEARCH_WEIGHTS: SearchWeights = {
  semantic: 4,
  identity: 10,
  trigram: 3,
  facts: 8,
  notes: 4,
  followUps: 6,
  events: 6,
  signals: 5,
};

/** Slider bounds for the tuning panel — generous enough to let one signal
 *  dominate or drop to near-zero without needing decimals. */
export const SEARCH_WEIGHT_MIN = 0;
export const SEARCH_WEIGHT_MAX = 20;

/** Order + labels for the tuning panel, one slider per hybridSearch source. */
export const SEARCH_WEIGHT_FIELDS: { key: keyof SearchWeights; label: string }[] = [
  { key: "semantic", label: "Semantic similarity" },
  { key: "identity", label: "Name, title, location, tags" },
  { key: "trigram", label: "Email, phone, link, domain" },
  { key: "facts", label: "Facts" },
  { key: "notes", label: "Notes" },
  { key: "followUps", label: "Follow-ups" },
  { key: "events", label: "Events" },
  { key: "signals", label: "Signals" },
];

/** ts_headline options: custom \x01 markers (stripped after) instead of the
 *  default <b>/</b> so plain-text snippet rendering never leaks HTML. */
export const SEARCH_HEADLINE_OPTS = "StartSel=\x01, StopSel=\x01, MaxWords=24, MinWords=6";

function clampSearchWeight(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(SEARCH_WEIGHT_MAX, Math.max(SEARCH_WEIGHT_MIN, value))
    : null;
}

/**
 * Parses a JSON-encoded weights object (from settings storage or a form
 * submission) — per-key, falling back to the default for anything missing,
 * invalid, or out of range, so a corrupt or partial value never breaks
 * search or throws; worst case, that one source's weight resets to default.
 */
export function parseSearchWeights(raw: string | null | undefined): SearchWeights {
  if (!raw) return DEFAULT_SEARCH_WEIGHTS;
  let parsed: Partial<Record<keyof SearchWeights, unknown>>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_SEARCH_WEIGHTS;
  }
  const weights = { ...DEFAULT_SEARCH_WEIGHTS };
  for (const key of Object.keys(DEFAULT_SEARCH_WEIGHTS) as (keyof SearchWeights)[]) {
    const clamped = clampSearchWeight(parsed[key]);
    if (clamped !== null) weights[key] = clamped;
  }
  return weights;
}
