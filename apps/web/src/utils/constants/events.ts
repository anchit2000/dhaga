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

/** Warm-leaning, mutually distinct hues that read on both /app themes. */
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
