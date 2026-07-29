/**
 * Group (event) decoration: a curated colour palette + emoji set users pick
 * from. Colours are stored as tokens (never raw hex) so the palette can change
 * without orphaning saved values; `eventColorHex` maps a token to its swatch.
 */

export interface EventColor {
  token: string;
  label: string;
  hex: string;
}

/**
 * Warm-leaning, mutually distinct hues, tuned for the dark theme: amber
 * (1.83:1), teal (~2.4:1) and green (~2.9:1) fall under WCAG's 3:1 on the
 * light canvas. Not re-tuned in place, because these hexes are persisted, not
 * just rendered — NODE_TYPE_COLOR_SWATCHES (utils/constants/graph.ts) feeds
 * the node-type picker, which stores the RAW HEX on the node type, so
 * changing a value here silently orphans every node type already saved with
 * it. Groups are safe (they store the token, not the hex); a light-mode fix
 * therefore belongs in a light/dark pair keyed off the token — the shape
 * GRAPH_NODE_COLORS uses — plus a migration for stored node-type hexes.
 */
export const EVENT_COLORS: readonly EventColor[] = [
  { token: "amber", label: "Amber", hex: "#e2a44c" },
  { token: "clay", label: "Clay", hex: "#cf6a4a" },
  { token: "rose", label: "Rose", hex: "#d9628a" },
  { token: "violet", label: "Violet", hex: "#8f6fd0" },
  { token: "blue", label: "Blue", hex: "#4f8fd6" },
  { token: "teal", label: "Teal", hex: "#2fa5a0" },
  { token: "green", label: "Green", hex: "#5a9e52" },
  { token: "slate", label: "Slate", hex: "#8a8172" },
] as const;

export const EVENT_COLOR_TOKENS: readonly string[] = EVENT_COLORS.map(
  (color) => color.token,
);

/** Resolve a stored token to its swatch hex; null for unset/unknown tokens. */
export function eventColorHex(token: string | null | undefined): string | null {
  if (!token) return null;
  return EVENT_COLORS.find((color) => color.token === token)?.hex ?? null;
}

/** Curated, event/networking-relevant emoji — no picker dependency needed. */
export const EVENT_EMOJIS: readonly string[] = [
  "🎪", "🎟️", "🤝", "🏢", "✈️", "🎓", "🍻", "🎤",
  "💼", "🌐", "🚀", "🎉", "📅", "🏆", "☕", "🍽️",
  "🎧", "🧑‍💻", "🏙️", "🔬", "🎨", "📸", "⚽", "🎮",
] as const;

/** Guard rails for user-authored group tags. */
export const EVENT_TAG_MAX = 12;
export const EVENT_TAG_MAX_LENGTH = 24;
