import {
  DEFAULT_THEME_FONT_ID,
  getThemeFont,
  THEME_FONTS,
  THEME_FONT_VARS,
  type ThemeFont,
  type ThemeFontId,
} from "./fonts";
import { PALETTE_VAR, type ThemePalette } from "./palette";
import {
  DEFAULT_THEME_PRESET_ID,
  getThemePreset,
  THEME_PRESETS,
  type ThemePreset,
  type ThemePresetId,
} from "./presets";

export {
  DEFAULT_THEME_FONT_ID,
  DEFAULT_THEME_PRESET_ID,
  getThemeFont,
  getThemePreset,
  PALETTE_VAR,
  THEME_FONTS,
  THEME_FONT_VARS,
  THEME_PRESETS,
};
export type { ThemeFont, ThemeFontId, ThemePalette, ThemePreset, ThemePresetId };

/** A user's persisted /app appearance: which palette, which face. */
export interface UiTheme {
  preset: ThemePresetId;
  font: ThemeFontId;
}

export const DEFAULT_UI_THEME: UiTheme = {
  preset: DEFAULT_THEME_PRESET_ID,
  font: DEFAULT_THEME_FONT_ID,
};

/**
 * Reads the stored settings value. Tolerant by design and never throws: bad
 * JSON, an unknown id from a newer or older build, a missing key, or `null` all
 * fall back PER FIELD to the default. That per-field fallback is what makes the
 * stored value forward- and backward-compatible — a user who picked a preset
 * that a rollback removed keeps their font choice instead of losing both, and a
 * corrupt row degrades to the brand rather than 500-ing the whole /app shell.
 */
export function parseUiTheme(raw: string | null): UiTheme {
  if (!raw) return DEFAULT_UI_THEME;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_UI_THEME;
  }
  if (typeof parsed !== "object" || parsed === null) return DEFAULT_UI_THEME;
  const { preset, font } = parsed as { preset?: unknown; font?: unknown };
  return {
    preset: getThemePreset(typeof preset === "string" ? preset : "").id,
    font: getThemeFont(typeof font === "string" ? font : "").id,
  };
}

export function serializeUiTheme(theme: UiTheme): string {
  return JSON.stringify({ preset: theme.preset, font: theme.font });
}

export function isDefaultUiTheme(theme: UiTheme): boolean {
  return (
    theme.preset === DEFAULT_THEME_PRESET_ID && theme.font === DEFAULT_THEME_FONT_ID
  );
}
