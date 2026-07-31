import type { ThemePreset } from "./types";

/**
 * Dhaga's own identity. `palettes: null` is not "no colours" — it means emit no
 * override at all, so the stock `--brand-*` values in globals.css apply exactly
 * as they always have. That keeps the default path byte-free (no extra <style>
 * in the HTML) and guarantees a user who never opens the theme picker sees the
 * brand the designers signed off on, not a re-derivation of it.
 */
export const DEFAULT_PRESET: ThemePreset = {
  id: "default",
  label: "Dhaga",
  description: "Warm near-black ground with the amber thread glow.",
  palettes: null,
};
