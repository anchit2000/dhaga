import { readBrandColors } from "@/lib/brand-colors";
import { BRAND_COLOR_VARS } from "@/utils/constants/brand";

/** Brand colours resolved from the live CSS custom properties so the WebGL
 *  canvas follows /app's light/dark toggle instead of hardcoding a theme. */
export interface GraphTheme {
  ink: string;
  panel: string;
  seam: string;
  paper: string;
  fog: string;
  amber: string;
  /** Deeper amber that stays readable on the light theme (circle labels). */
  ember: string;
  monoFont: string;
}

const FALLBACK_MONO_FONT = "monospace";

export function resolveGraphTheme(element: HTMLElement): GraphTheme {
  const colors = readBrandColors(BRAND_COLOR_VARS, element);
  const monoFont =
    getComputedStyle(element).getPropertyValue("--font-plex-mono").trim() || FALLBACK_MONO_FONT;
  return {
    ink: colors["--brand-ink"],
    panel: colors["--brand-panel"],
    seam: colors["--brand-seam"],
    paper: colors["--brand-paper"],
    fog: colors["--brand-fog"],
    amber: colors["--brand-amber"],
    ember: colors["--brand-ember"],
    monoFont,
  };
}
