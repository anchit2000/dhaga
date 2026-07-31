/**
 * The surface contract a user theme overrides.
 *
 * `globals.css` resolves EVERY surface — marketing, /app/**, /docs, /blog — from
 * the `--brand-*` custom properties declared on `:root` (light) and `.dark`
 * (dark). A user theme is therefore not a stylesheet: it is a replacement set of
 * values for exactly these properties. Nothing else needs to know a theme
 * exists.
 *
 * Every key is required. A partial palette produces a half-themed UI — the
 * unset surfaces silently keep Dhaga's amber while the rest turns, say, blue —
 * so the type refuses to let a preset ship incomplete.
 */
export interface ThemePalette {
  /** page ground */
  ink: string;
  /** card / popover ground */
  panel: string;
  /** muted / secondary ground */
  panel2: string;
  /** decorative separator — deliberately restrained, not contrast-bound */
  seam: string;
  /** control + input boundary — must clear the 3:1 WCAG non-text minimum */
  line: string;
  /** primary text */
  paper: string;
  /** secondary text */
  fog: string;
  /** accent FILL (primary button, badges) — never used as light-mode text */
  amber: string;
  /** lighter stop of the primary-button ramp */
  amberLift: string;
  /** darker stop of the primary-button ramp */
  amberSink: string;
  /** accent TEXT + focus ring — the token that has to stay readable on `ink` */
  ember: string;
  /** recessed well behind inset content */
  well: string;
  /** foreground that sits on top of the accent fill */
  onAccent: string;
  /** inverted wash used by high-emphasis blocks */
  wash: string;
  /** cast shadow colour (an rgba(), not a solid) */
  shadowCast: string;
  /** softer cast shadow colour (an rgba(), not a solid) */
  shadowCastSoft: string;
  /** error text/fill — must stay readable on `panel` */
  destructive: string;
  /** shadcn `--input` boundary; light needs the stronger `line`, dark the seam */
  input: string;
}

/**
 * Short palette key → the CSS custom property it writes. Declaration order here
 * is the emission order in the generated stylesheet, so keep it grouped the way
 * globals.css reads (grounds → borders → text → accent → semantics).
 */
export const PALETTE_VAR: Record<keyof ThemePalette, string> = {
  ink: "--brand-ink",
  panel: "--brand-panel",
  panel2: "--brand-panel-2",
  seam: "--brand-seam",
  line: "--brand-line",
  paper: "--brand-paper",
  fog: "--brand-fog",
  amber: "--brand-amber",
  amberLift: "--brand-amber-lift",
  amberSink: "--brand-amber-sink",
  ember: "--brand-ember",
  well: "--brand-well",
  onAccent: "--brand-on-accent",
  wash: "--brand-wash",
  shadowCast: "--shadow-cast",
  shadowCastSoft: "--shadow-cast-soft",
  destructive: "--destructive",
  input: "--input",
};
