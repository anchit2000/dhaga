/** Dark-theme brand colour hex values — the fallback used wherever a
 *  `--brand-*` custom property can't be read live (SSR, WebGL canvases that
 *  can't consume CSS vars, or the property missing entirely). Source of
 *  truth for the live values is `apps/web/src/app/globals.css`. */
export const BRAND_COLOR_FALLBACKS = {
  "--brand-ink": "#0d0b09",
  "--brand-panel": "#16120e",
  "--brand-seam": "#2b241b",
  "--brand-paper": "#f3ede2",
  "--brand-fog": "#a49a8a",
  "--brand-amber": "#e2a44c",
  "--brand-ember": "#c37731",
} as const;

/** Brand CSS custom-property names that resolve through `BRAND_COLOR_FALLBACKS`. */
export type BrandColorVar = keyof typeof BRAND_COLOR_FALLBACKS;

export const BRAND_COLOR_VARS = Object.keys(BRAND_COLOR_FALLBACKS) as BrandColorVar[];
