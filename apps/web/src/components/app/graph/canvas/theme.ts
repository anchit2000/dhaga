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

const FALLBACK: GraphTheme = {
  ink: "#0d0b09",
  panel: "#16120e",
  seam: "#2b241b",
  paper: "#f3ede2",
  fog: "#a49a8a",
  amber: "#e2a44c",
  ember: "#c37731",
  monoFont: "monospace",
};

export function resolveGraphTheme(element: HTMLElement): GraphTheme {
  const styles = getComputedStyle(element);
  const read = (name: string, fallback: string): string =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    ink: read("--brand-ink", FALLBACK.ink),
    panel: read("--brand-panel", FALLBACK.panel),
    seam: read("--brand-seam", FALLBACK.seam),
    paper: read("--brand-paper", FALLBACK.paper),
    fog: read("--brand-fog", FALLBACK.fog),
    amber: read("--brand-amber", FALLBACK.amber),
    ember: read("--brand-ember", FALLBACK.ember),
    monoFont: read("--font-plex-mono", FALLBACK.monoFont) || FALLBACK.monoFont,
  };
}
