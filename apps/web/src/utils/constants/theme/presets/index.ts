import { CONTRAST_PRESET } from "./contrast";
import { DEFAULT_PRESET } from "./default";
import { FOREST_PRESET } from "./forest";
import { MONO_PRESET } from "./mono";
import { OCEAN_PRESET } from "./ocean";
import { ROSE_PRESET } from "./rose";
import { VIOLET_PRESET } from "./violet";
import type { ThemePreset, ThemePresetId } from "./types";

export type { ThemePreset, ThemePresetId };

/** Picker order. Dhaga first, then the two neutrals, then the hues. */
export const THEME_PRESETS: ThemePreset[] = [
  DEFAULT_PRESET,
  MONO_PRESET,
  CONTRAST_PRESET,
  ROSE_PRESET,
  OCEAN_PRESET,
  FOREST_PRESET,
  VIOLET_PRESET,
];

export const DEFAULT_THEME_PRESET_ID: ThemePresetId = "default";

/** Unknown ids resolve to Dhaga's own preset — a value written by a newer
 *  build (or corrupted) must degrade to the brand, never to a blank UI. */
export function getThemePreset(id: string): ThemePreset {
  return THEME_PRESETS.find((preset) => preset.id === id) ?? DEFAULT_PRESET;
}
