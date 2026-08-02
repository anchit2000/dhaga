import type { ThemePalette } from "../palette";

export type ThemePresetId =
  | "default"
  | "classic"
  | "mono"
  | "contrast"
  | "rose"
  | "ocean"
  | "forest"
  | "violet";

/**
 * A preset supplies BOTH modes, never one.
 *
 * Picking a preset must not take the light/dark toggle away from the user: the
 * existing next-themes `.dark` class keeps deciding which of the two palettes
 * resolves, and the preset only decides the hues. `palettes: null` means "emit
 * nothing" — the stock globals.css values apply untouched, which is what makes
 * the default path cost zero bytes.
 */
export interface ThemePreset {
  id: ThemePresetId;
  label: string;
  description: string;
  palettes: { light: ThemePalette; dark: ThemePalette } | null;
}
