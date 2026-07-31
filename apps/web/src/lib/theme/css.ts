import {
  getThemeFont,
  getThemePreset,
  isDefaultUiTheme,
  PALETTE_VAR,
  type ThemePalette,
  type UiTheme,
} from "@/utils/constants/theme";

/** Everything below is interpolated from a CLOSED constant set keyed by ids
 *  that `parseUiTheme` has already validated — no user-supplied string ever
 *  reaches this CSS, so there is no injection surface. The guard is a cheap
 *  belt-and-braces against a future preset gaining a hand-edited value. */
const UNSAFE_VALUE = /[;{}<]/;

function declare(property: string, value: string): string {
  return UNSAFE_VALUE.test(value) ? "" : `${property}:${value};`;
}

function paletteVars(palette: ThemePalette): string {
  return (Object.keys(PALETTE_VAR) as (keyof ThemePalette)[])
    .map((key) => declare(PALETTE_VAR[key], palette[key]))
    .join("");
}

/**
 * The stylesheet for one user's /app appearance, or `null` when the theme is
 * fully default — the default path must emit nothing at all, not an empty rule.
 *
 * Two things here are load-bearing and look like typos otherwise:
 *
 * 1. `:root:root:root` is specificity (0,3,0) and `:root:root:root.dark` is
 *    (0,4,0); globals.css declares the same properties at `:root` / `.dark`,
 *    which is (0,1,0). The repetition makes this override win REGARDLESS OF
 *    STYLESHEET ORDER — necessary because a <style> emitted from a nested
 *    layout has no guaranteed position relative to the imported global sheet.
 * 2. The descendant arm `:root:root:root .dark` exists because several
 *    components force a `.dark` subtree mid-page (the camera capture, the photo
 *    cropper — see the comment on the `:root, .dark` rule in globals.css).
 *    Without it those subtrees would re-resolve `--brand-*` locally and keep the
 *    STOCK Dhaga palette while the rest of the page used the user's.
 *
 * Font variables ride the light rule only: they are mode-independent, and both
 * `--font-sans` and `--font-display` are overridden because setting only the
 * first would leave every heading on Geist Pixel while body text changed.
 */
export function buildUserThemeCss(theme: UiTheme): string | null {
  if (isDefaultUiTheme(theme)) return null;

  const { palettes } = getThemePreset(theme.preset);
  const { stack } = getThemeFont(theme.font);

  const fontVars = stack
    ? declare("--font-sans", stack) + declare("--font-display", stack)
    : "";
  const light = palettes ? paletteVars(palettes.light) : "";
  const dark = palettes ? paletteVars(palettes.dark) : "";

  const rules = [`:root:root:root{${light}${fontVars}}`];
  if (dark) rules.push(`:root:root:root.dark,:root:root:root .dark{${dark}}`);
  return rules.join("");
}
