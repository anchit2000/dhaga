import { describe, expect, it } from "vitest";
import { THEME_PRESETS } from "../presets";
import type { ThemePalette } from "../palette";

/**
 * WCAG 2.1 relative luminance + contrast ratio, computed from the preset hexes
 * themselves. Deliberately hand-rolled and dependency-free: these numbers are
 * the acceptance criteria for shipping a palette, so the maths that produces
 * them belongs in the repo where a reviewer can read it.
 */
function channelLuminance(component: number): number {
  const c = component / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = channelLuminance(parseInt(value.slice(0, 2), 16));
  const g = channelLuminance(parseInt(value.slice(2, 4), 16));
  const b = channelLuminance(parseInt(value.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/** Reports the ratio so a failure names the actual number, not just "false". */
function expectContrast(
  palette: ThemePalette,
  fg: keyof ThemePalette,
  bg: keyof ThemePalette,
  min: number,
): void {
  const ratio = contrast(palette[fg], palette[bg]);
  expect(
    ratio,
    `${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1`,
  ).toBeGreaterThanOrEqual(min);
}

const themed = THEME_PRESETS.filter((preset) => preset.palettes !== null);

describe("theme presets meet the contrast rules globals.css documents", () => {
  it("ships exactly one preset with no palette — Dhaga's own", () => {
    // The default emits no override, so the stock globals.css values (each
    // already annotated with its measured ratio there) are what apply. Every
    // OTHER preset replaces those values wholesale and therefore has to earn
    // the same guarantees from scratch, which is what the loop below does.
    const bare = THEME_PRESETS.filter((preset) => preset.palettes === null);
    expect(bare.map((preset) => preset.id)).toEqual(["default"]);
    expect(themed.length).toBe(THEME_PRESETS.length - 1);
  });

  for (const preset of themed) {
    for (const mode of ["light", "dark"] as const) {
      const palette = preset.palettes![mode];

      describe(`${preset.id} / ${mode}`, () => {
        // Body text on every ground a card can sit on. A preset that only
        // checks `ink` ships readable pages and unreadable dialogs, because
        // popovers/cards resolve to panel and muted blocks to panel-2.
        it("primary text clears AA on all three grounds", () => {
          expectContrast(palette, "paper", "ink", 4.5);
          expectContrast(palette, "paper", "panel", 4.5);
          expectContrast(palette, "paper", "panel2", 4.5);
        });

        // Secondary text is still text. `fog` carries timestamps, counts and
        // helper copy — muting it below AA is the most common way a themed UI
        // becomes unusable while still "looking fine".
        it("secondary text clears AA", () => {
          expectContrast(palette, "fog", "ink", 4.5);
          expectContrast(palette, "fog", "panel", 4.5);
        });

        // The exact trap globals.css spells out: amber is a FILL, and using it
        // as light-mode text ships 1.83:1 links. `ember` is the accent-TEXT
        // token, so it is the one that must survive on the page ground.
        it("accent text clears AA on the page ground", () => {
          expectContrast(palette, "ember", "ink", 4.5);
        });

        // The primary button is a gradient between amberSink and amberLift with
        // onAccent label text over it, so all three stops need the label to
        // hold — checking only the mid stop lets the ends fail silently.
        it("button label clears AA across the whole accent ramp", () => {
          expectContrast(palette, "onAccent", "amber", 4.5);
          expectContrast(palette, "onAccent", "amberLift", 4.5);
          expectContrast(palette, "onAccent", "amberSink", 4.5);
        });

        // `line` is the control/input boundary — the thing that tells a user
        // where an input ends. WCAG's non-text minimum is 3:1, and this is the
        // token globals.css split from the decorative `seam` precisely so it
        // could be held to it.
        it("control boundaries clear the 3:1 non-text minimum", () => {
          expectContrast(palette, "line", "ink", 3);
          expectContrast(palette, "line", "panel", 3);
        });

        // Errors are read under stress and often inside a card. A hue swap must
        // not drag the destructive token into the new palette's mid-tones.
        it("error text clears AA on a card", () => {
          expectContrast(palette, "destructive", "panel", 4.5);
        });
      });
    }
  }
});
