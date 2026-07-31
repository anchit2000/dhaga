export type ThemeFontId =
  | "default"
  | "system"
  | "inter"
  | "roboto"
  | "open-sans"
  | "lato"
  | "montserrat"
  | "poppins";

/**
 * CSS variable names the ROOT LAYOUT declares via next/font/google, one per
 * downloadable face. They live here rather than as string literals in both
 * places so the layout and the font stacks below cannot drift apart — a rename
 * in one file without the other would silently fall through to the fallback
 * stack with no error anywhere.
 */
export const THEME_FONT_VARS = {
  inter: "--font-inter",
  roboto: "--font-roboto",
  "open-sans": "--font-open-sans",
  lato: "--font-lato",
  montserrat: "--font-montserrat",
  poppins: "--font-poppins",
} as const;

/** Fallbacks appended after every webfont, so text is legible during (or
 *  instead of) the download. */
const FALLBACK_STACK = "ui-sans-serif, system-ui, sans-serif";

export interface ThemeFont {
  id: ThemeFontId;
  label: string;
  description: string;
  /** CSS value for --font-sans / --font-display; null = the stock Geist Pixel
   *  stack declared in globals.css. */
  stack: string | null;
}

const GEIST_PIXEL_FONT: ThemeFont = {
  id: "default",
  label: "Geist Pixel",
  description: "Dhaga's display face. Self-hosted, already loaded.",
  stack: null,
};

/** Picker order: the brand face first, then the zero-download option, then the
 *  Google faces alphabetically. */
export const THEME_FONTS: ThemeFont[] = [
  GEIST_PIXEL_FONT,
  {
    id: "system",
    label: "System",
    description: "Your OS's own UI face. Downloads nothing.",
    stack: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  {
    id: "inter",
    label: "Inter",
    description: "Neutral grotesque, tuned for screens.",
    stack: `var(${THEME_FONT_VARS.inter}), ${FALLBACK_STACK}`,
  },
  {
    id: "roboto",
    label: "Roboto",
    description: "Android's workhorse. Compact and familiar.",
    stack: `var(${THEME_FONT_VARS.roboto}), ${FALLBACK_STACK}`,
  },
  {
    id: "open-sans",
    label: "Open Sans",
    description: "Open, humanist shapes. Easy at small sizes.",
    stack: `var(${THEME_FONT_VARS["open-sans"]}), ${FALLBACK_STACK}`,
  },
  {
    id: "lato",
    label: "Lato",
    description: "Warm humanist sans with a slight serif feel.",
    stack: `var(${THEME_FONT_VARS.lato}), ${FALLBACK_STACK}`,
  },
  {
    id: "montserrat",
    label: "Montserrat",
    description: "Wide geometric sans. Headings carry well.",
    stack: `var(${THEME_FONT_VARS.montserrat}), ${FALLBACK_STACK}`,
  },
  {
    id: "poppins",
    label: "Poppins",
    description: "Round geometric sans. Friendly, high x-height.",
    stack: `var(${THEME_FONT_VARS.poppins}), ${FALLBACK_STACK}`,
  },
];

export const DEFAULT_THEME_FONT_ID: ThemeFontId = "default";

/** Unknown ids resolve to Geist Pixel, same reasoning as `getThemePreset`. */
export function getThemeFont(id: string): ThemeFont {
  return THEME_FONTS.find((font) => font.id === id) ?? GEIST_PIXEL_FONT;
}
